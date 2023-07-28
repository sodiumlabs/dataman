import { JsonFragment } from '@ethersproject/abi';

// contractList/lumifi/Airdrop.json contractList/lumifi/BridgedUSDC2CRVProxy.json contractList/lumifi/BridgedUSDT2CRVProxy.json contractList/lumifi/Config.json contractList/lumifi/DAOValut.json contractList/lumifi/FeeRouter.json contractList/lumifi/GameNFT.json contractList/lumifi/GewardValut.json contractList/lumifi/GovToken.json contractList/lumifi/index.ts contractList/lumifi/LiquidityStake.json contractList/lumifi/LUAUSDExchangeProxy.json contractList/lumifi/LUAUSDLiqulityProxy.json contractList/lumifi/Minter.json contractList/lumifi/PriceField.json contractList/lumifi/PRToken.json contractList/lumifi/Raffles.json contractList/lumifi/StableToken.json contractList/lumifi/UtilityStake.json contractList/lumifi/UtilityToken.json contractList/lumifi/VAMM.json
import Airdrop from './Airdrop.json';
import BridgedUSDC2CRVProxy from './BridgedUSDC2CRVProxy.json';
import BridgedUSDT2CRVProxy from './BridgedUSDT2CRVProxy.json';
import Config from './Config.json';
import DAOValut from './DAOValut.json';
import FeeRouter from './FeeRouter.json';
import GameNFT from './GameNFT.json';
import GewardValut from './GewardValut.json';
import GovToken from './GovToken.json';
import LiquidityStake from './LiquidityStake.json';
import LUAUSDExchangeProxy from './LUAUSDExchangeProxy.json';
import LUAUSDLiqulityProxy from './LUAUSDLiqulityProxy.json';
import Minter from './Minter.json';
import PriceField from './PriceField.json';
import PRToken from './PRToken.json';
import Raffles from './Raffles.json';
import StableToken from './StableToken.json';
import UtilityStake from './UtilityStake.json';
import UtilityToken from './UtilityToken.json';
import VAMM from './VAMM.json';

type ContractABI = JsonFragment;

type Contract = {
    ContractName: string;
    ABI: ContractABI[];
    Implementation: string;
}

const LumiContracts: {
    [address: string]: Contract;
} = {};

LumiContracts[Airdrop.address.toLowerCase()] = {
    ContractName: "Lumifi-Airdrop",
    ABI: Airdrop.abi,
    Implementation: ""
}

LumiContracts[BridgedUSDC2CRVProxy.address.toLowerCase()] = {
    ContractName: "Lumifi-USDC2CRVProxy",
    ABI: BridgedUSDC2CRVProxy.abi,
    Implementation: ""
};

LumiContracts[BridgedUSDT2CRVProxy.address.toLowerCase()] = {
    ContractName: "Lumifi-USDT2CRVProxy",
    ABI: BridgedUSDT2CRVProxy.abi,
    Implementation: ""
};

LumiContracts[Config.address.toLowerCase()] = {
    ContractName: "Lumifi-Config",
    ABI: Config.abi,
    Implementation: ""
};

LumiContracts[DAOValut.address.toLowerCase()] = {
    ContractName: "Lumifi-DAOValut",
    ABI: DAOValut.abi,
    Implementation: ""
};

LumiContracts[FeeRouter.address.toLowerCase()] = {
    ContractName: "Lumifi-FeeRouter",
    ABI: FeeRouter.abi,
    Implementation: ""
};

LumiContracts[GameNFT.address.toLowerCase()] = {
    ContractName: "Lumifi-GameNFT",
    ABI: GameNFT.abi,
    Implementation: ""
};

LumiContracts[GewardValut.address.toLowerCase()] = {
    ContractName: "Lumifi-GewardValut",
    ABI: GewardValut.abi,
    Implementation: ""
};

LumiContracts[GovToken.address.toLowerCase()] = {
    ContractName: "LUAG token",
    ABI: GovToken.abi,
    Implementation: ""
};

LumiContracts[LiquidityStake.address.toLowerCase()] = {
    ContractName: "Lumifi-LiquidityStake",
    ABI: LiquidityStake.abi,
    Implementation: ""
};

LumiContracts[LUAUSDExchangeProxy.address.toLowerCase()] = {
    ContractName: "Lumifi-LUAUSDExchangeProxy",
    ABI: LUAUSDExchangeProxy.abi,
    Implementation: ""
};

LumiContracts[LUAUSDLiqulityProxy.address.toLowerCase()] = {
    ContractName: "Lumifi-LUAUSDProxy",
    ABI: LUAUSDLiqulityProxy.abi,
    Implementation: ""
};

LumiContracts[Minter.address.toLowerCase()] = {
    ContractName: "Lumifi-Minter",
    ABI: Minter.abi,
    Implementation: ""
};

LumiContracts[PriceField.address.toLowerCase()] = {
    ContractName: "Lumifi-PriceField",
    ABI: PriceField.abi,
    Implementation: ""
};

LumiContracts[PRToken.address.toLowerCase()] = {
    ContractName: "Lumifi-OPToken",
    ABI: PRToken.abi,
    Implementation: ""
};

LumiContracts[Raffles.address.toLowerCase()] = {
    ContractName: "Lumifi-Raffles",
    ABI: Raffles.abi,
    Implementation: ""
};

LumiContracts[StableToken.address.toLowerCase()] = {
    ContractName: "LUAUSD",
    ABI: StableToken.abi,
    Implementation: ""
};

LumiContracts[UtilityStake.address.toLowerCase()] = {
    ContractName: "Lumifi-Stake",
    ABI: UtilityStake.abi,
    Implementation: ""
};

LumiContracts[UtilityToken.address.toLowerCase()] = {
    ContractName: "LUA",
    ABI: UtilityToken.abi,
    Implementation: ""
};

LumiContracts[VAMM.address.toLowerCase()] = {
    ContractName: "Lumifi-VAMM",
    ABI: VAMM.abi,
    Implementation: ""
};

export default LumiContracts;