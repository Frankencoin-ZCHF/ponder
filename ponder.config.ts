import createConfigMainnet from './ponder.config.mainnet';
import createConfigTestnet from './ponder.config.testnet';

export default process.env.PONDER_PROFILE == 'testnet' ? createConfigTestnet : createConfigMainnet;
