import { BigNumber, Contract, ethers } from 'ethers';
import { Chain } from './chain';
import { metadata } from './erc20-metadata';
declare let base58Check: any;

export class Token {
  id: number;
  ticker: string;
  chain: Chain;
  title: string;
  erc20: string;
  destination: 'Strax' | 'Cirrus';
  addressPrefix: number;
  contract: Contract;
  decimals: number;

  constructor(data: TokenData, chain: Chain, id: number, ether: ethers.providers.Web3Provider) {
    this.id = id;
    this.ticker = data.ticker;
    this.chain = chain;
    this.title = data.title;
    this.destination = data.destination;
    this.erc20 = data.erc20;
    this.addressPrefix = data.addressPrefix;
    this.decimals = data.decimals;

    this.contract = new Contract(data.erc20, metadata, ether);
  }

  async balance(address: string): Promise<string> {
    const balance = await this.contract['balanceOf'](address) as BigNumber;
    return balance.toString();
  }
  burnCall(amount: string, address: string): string {
    return this.contract.interface.encodeFunctionData('burn', [amount, address]);
  }

  transferCall(to: string, amount: string): string {
    return this.contract.interface.encodeFunctionData('transfer', [to, amount]);
  }

  /**Validates destination address for cirrus or strax networks */
  validateAddress(address: string) {
    try {
      var result = base58Check.decode(address);
      return result.prefix[0] == this.addressPrefix;
    } catch (e) {
      return false;
    }
  }
}

interface TokenData {
  ticker: string,
  chain: 'Main' | 'Ropsten',
  title: string,
  destination: 'Strax' | 'Cirrus',
  erc20: string,
  addressPrefix: number;
  decimals: number;
}

export const TOKENS: TokenData[] = [
  {
    ticker: 'WSTRAX',
    chain: 'Main',
    title: 'WStrax => Strax',
    destination: 'Strax',
    erc20: '0xa3c22370de5f9544f0c4de126b1e46ceadf0a51b',
    addressPrefix: 75,
    decimals: 18
  },
  {
    ticker: 'WETH',
    chain: 'Main',
    title: 'Wrapped ETH',
    destination: 'Cirrus',
    erc20: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    addressPrefix: 28,
    decimals: 18
  },
  {
    ticker: 'WBTC',
    chain: 'Main',
    title: 'Wrapped BTC',
    destination: 'Cirrus',
    erc20: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    addressPrefix: 28,
    decimals: 8
  },
  {
    ticker: 'USDC',
    chain: 'Main',
    title: 'USDC',
    destination: 'Cirrus',
    erc20: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    addressPrefix: 28,
    decimals: 6
  },
  {
    ticker: 'USDT',
    chain: 'Main',
    title: 'USDT',
    destination: 'Cirrus',
    erc20: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    addressPrefix: 28,
    decimals: 6
  },
  {
    ticker: 'LINK',
    chain: 'Main',
    title: 'LINK',
    destination: 'Cirrus',
    erc20: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    addressPrefix: 28,
    decimals: 18
  },
  {
    ticker: 'SHIB',
    chain: 'Main',
    title: 'SHIB',
    destination: 'Cirrus',
    erc20: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
    addressPrefix: 28,
    decimals: 18
  },

  //
  {
    ticker: 'WSTRAX',
    chain: 'Ropsten',
    title: 'WStrax => Strax',
    destination: 'Strax',
    erc20: '0xde09a7cb4c7631f243e5a5454cbb02404aea65e7',
    addressPrefix: 120,
    decimals: 18
  },
  {
    ticker: 'TSTX',
    chain: 'Ropsten',
    title: 'Test Token',
    destination: 'Cirrus',
    erc20: '0xf5dab0f35378ea5fc69149d0f20ba0c16b170a3d',
    addressPrefix: 127,
    decimals: 18
  },
  {
    ticker: 'TSTY',
    chain: 'Ropsten',
    title: 'Test Token 2',
    destination: 'Cirrus',
    erc20: '0x2b3b0bd8219ffe0c22ffcdefbc81b7efa5c8d9ba',
    addressPrefix: 127,
    decimals: 8
  },
  {
    ticker: 'TSTZ',
    chain: 'Ropsten',
    title: 'Test Token 3',
    destination: 'Cirrus',
    erc20: '0x4cb3e0b719a7707c0148e21585d8011213de6708',
    addressPrefix: 127,
    decimals: 6
  },
];
