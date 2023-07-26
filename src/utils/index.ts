import _BigNumber from "bignumber.js";
import { Principal } from "@dfinity/principal";

// @ts-ignore hijack bigint
BigInt.prototype.toJSON = function () {
  return this.toString();
};

_BigNumber.config({
  ROUNDING_MODE: _BigNumber.ROUND_DOWN,
});

export const BigNumber = _BigNumber;

export { _BigNumber };

export function isPrincipal(principal: any): principal is Principal {
  return !!principal && principal._isPrincipal;
}

export function isValidPrincipal(principal: string): boolean {
  try {
    return principal === Principal.fromText(principal).toText();
  } catch (e) {
    return false;
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
