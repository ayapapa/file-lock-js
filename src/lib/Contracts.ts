import { createContracts, type ErrorClassType } from '@ayapapa-npm/contracts-js';
export const Contracts = createContracts();
const { ENSURE, ENSURE_DEBUG, REQUIRE, REQUIRE_DEBUG, VERIFY, VERIFY_DEBUG } = Contracts;
export { ENSURE, ENSURE_DEBUG, REQUIRE, REQUIRE_DEBUG, VERIFY, VERIFY_DEBUG, type ErrorClassType };
export default Contracts;