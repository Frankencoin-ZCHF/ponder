import createConfigMainnet, * as deployment from './ponder.config.mainnet';
import createConfigTestnet, * as testing from './ponder.config.testnet';

export const isTestDeployment = process.env.PONDER_PROFILE == 'testnet';

export const chain = isTestDeployment ? testing.chain : deployment.chain;
export const id = isTestDeployment ? testing.id : deployment.id;
export const addr = isTestDeployment ? testing.addr : deployment.addr;
export const config = isTestDeployment ? testing.config : deployment.config;

export default isTestDeployment ? createConfigTestnet : createConfigMainnet;
