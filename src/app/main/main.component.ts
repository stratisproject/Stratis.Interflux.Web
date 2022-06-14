import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import MetaMaskOnboarding from '@metamask/onboarding';
import { ethers, utils } from 'ethers';
import { fromEvent, Subscription } from 'rxjs';
import { Chain } from '../services/chain';
import { TokenService } from '../services/token.service';
import { Token } from '../services/tokens';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {
  connected = false;
  connecting = false;
  account = '';
  balance = '0';
  chain?: Chain;
  tokenOptions: { title: string; tokens: Token[]; }[] = [];
  token?: Token;
  form: FormGroup;
  tokens: Token[];
  chains: Chain[];
  ethereum: any;
  subscription = new Subscription();
  returnAddress?: string;
  registeryMessage?: string;
  alert?: { type: string, message: string };
  metaMaskInstalled: boolean;
  constructor(
    tokenService: TokenService,
    private web3Provider: ethers.providers.Web3Provider,
    @Inject('BASE_URL') private baseUrl: string
  ) {
    this.tokens = tokenService.tokens;
    this.chains = tokenService.chains;
    this.form = new FormGroup({
      tokenId: new FormControl(0, { validators: [] }),
      address: new FormControl(null, { validators: [Validators.required, this.validateAddress], asyncValidators: [this.validateAddressRegistery] }),
      amount: new FormControl(null, { validators: [] }),
    });

    this.metaMaskInstalled = MetaMaskOnboarding.isMetaMaskInstalled();
  }

  ngOnInit(): void {
    console.log(utils);
    this.ethereum = (window as any).ethereum;

    if (!this.ethereum)
      return;

    let subscription = fromEvent<string[]>(this.ethereum, 'accountsChanged').subscribe(this.updateAccount);

    this.subscription.add(subscription);

    subscription = fromEvent<string>(this.ethereum, 'chainChanged').subscribe(chainId => window.location.reload());

    this.subscription.add(subscription);

    subscription = this.tokenId.valueChanges.subscribe((value: number) => this.tokenSelected(value));

    this.subscription.add(subscription);
  }

  get tokenId() { return this.form.get('tokenId')!; }
  get amount() { return this.form.get('amount')!; }
  get address() { return this.form.get('address')!; }

  closeAlert() {
    this.alert = undefined;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  validateAddress = () => {
    if (!this.token)
      return {};

    const address = this.address.value as string;

    if (!address)
      return {};

    const valid = this.token.validateAddress(address);

    if (valid)
      return {};

    return { address: true };
  }

  validateAddressRegistery = async () => {
    if (this.token?.destination == 'Strax')
      return {};

    if (this.returnAddress == this.address.value)
      return {};

    return { addressRegistery: true };
  }

  async registerAddress() {
    try {
      this.registeryMessage = 'Transaction submit is waiting...'
      this.form.disable();
      const newAddress = this.address.value as string;
      var data = this.token!.chain.registerAddressCall(newAddress);
      const txid: string = await this.web3Provider.send('eth_sendTransaction',
        [
          {
            from: this.account,
            to: this.token!.chain.kvStoreAddress,
            value: '0x0',
            data: data
          }
        ]
      );

      this.registeryMessage = 'The address is registering now. Please keep waiting...';

      await this.web3Provider.waitForTransaction(txid, 1);

      this.returnAddress = newAddress;

      this.alert = { type: 'success', message: 'Your return address registered successfully.' };
    } catch {
    }

    this.registeryMessage = undefined
    this.form.enable();
  }

  updateAccount(accounts: string[]) {
    if (accounts.length == 0) {
      this.connected = false;
      return;
    }
    this.account = accounts[0];
  }

  async tokenSelected(tokenId: number) {

    this.token = this.tokens.find(t => t.id == tokenId);

    if (!this.token) {
      return;
    }

    if (!this.address.dirty && this.token!.destination == 'Cirrus') {
      this.address.setValue(this.returnAddress);
    } else if (!this.address.dirty) {
      this.address.setValue(null);
    }

    this.balance = await this.token!.balance(this.account);

    this.amount.clearValidators();
    this.amount.addValidators([
      Validators.required,
      Validators.min(utils.formatUnits("1", this.token!.decimals) as any),
      Validators.max(utils.formatUnits(this.balance, this.token!.decimals) as any)
    ]);

    this.amount.updateValueAndValidity();
    this.address.updateValueAndValidity();
  }

  updateTokenOptions() {
    this.tokenOptions = [
      {
        title: 'ETH To Strax Chain',
        tokens: this.tokens.filter(t => t.destination == 'Strax' && t.chain == this.chain),
      },
      {
        title: 'ETH To Cirrus Sidechain',
        tokens: this.tokens.filter(t => t.destination == 'Cirrus' && t.chain == this.chain),
      }
    ];
  }

  async connect() {
    try {
      this.connecting = true;
      const accounts: string[] = await this.getAccounts();

      this.updateAccount(accounts);
      const chainId: string = await this.getChainId();
      this.chain = this.chains.find(c => c.id == chainId);

      this.updateTokenOptions();

      this.returnAddress = await this.chain!.getAddress(this.account);

      this.connected = true;
    } catch { }

    this.connecting = false;
  }

  async getChainId(): Promise<string> {
    return await this.web3Provider.send('eth_chainId', []);
  }

  async getAccounts(): Promise<string[]> {
    return await this.web3Provider.send('eth_requestAccounts', []);
  }

  setFullBalance() {
    if (this.token?.decimals == 18)
      this.form.get('amount')!.setValue(utils.formatEther(this.balance));
    else
      this.form.get('amount')!.setValue(utils.formatUnits(this.balance, this.token?.decimals));
  }

  async transfer() {
    const token = this.token!;
    const chain = this.chain!;

    var amount = utils.parseUnits(this.amount.value, token.decimals).toString();

    const callData = token.destination == 'Strax' ?
      token.burnCall(amount, this.address.value) :
      token.transferCall(chain.multisigAddress, amount);

    this.form.disable();

    const txid = await this.web3Provider.send('eth_sendTransaction',
      [
        {
          from: this.account,
          to: token.erc20,
          value: '0x0',
          data: callData
        }
      ]
    ).finally(() => this.form.enable());
    this.amount.reset();

    var a = `<a target="_blank" href="${chain.txUrl(txid)}">transfer details</a>.`;
    this.alert = { type: 'success', message: 'The Transfer submitted successfully. See your  ' + a };
  }

  async addWallet() {
    await this.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: this.token!.erc20,
          symbol: this.token!.ticker,
          decimals: this.token!.decimals,
        },
      },
    });
  }

  toEther(amount: string) {
    return utils.formatUnits(amount, this.token?.decimals);
  }

  install() {
    const onboarding = new MetaMaskOnboarding();
    MetaMaskOnboarding.isMetaMaskInstalled
    onboarding.startOnboarding();
  }
}
