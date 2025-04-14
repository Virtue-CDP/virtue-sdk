import { COIN } from "@/types";

export const COINS_TYPE_LIST: Record<COIN, string> = {
  IOTA: "0x0000000000000000000000000000000000000000000000000002::iota::iota",
  stIOTA:
    "0x14f9e69c0076955d5a056260c9667edab184650dba9919f168a37030dd956dc6::cert::cert",
  VUSD: "0xa57cfb230e3d620feffbf3de018a09e6f447995c65bd420d158f4c6f0de1f564::vusd::vusd",
};

export const COIN_DECIMALS: Record<COIN, number> = {
  IOTA: 9,
  stIOTA: 9,
  VUSD: 9,
};
