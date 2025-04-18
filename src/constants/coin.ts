import { COIN } from "@/types";

export const COINS_TYPE_LIST: Record<COIN, string> = {
  IOTA: "0x0000000000000000000000000000000000000000000000000002::iota::iota",
  stIOTA:
    "0x14f9e69c0076955d5a056260c9667edab184650dba9919f168a37030dd956dc6::cert::cert",
  VUSD: "0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081::vusd::vusd",
};

export const COIN_DECIMALS: Record<COIN, number> = {
  IOTA: 9,
  stIOTA: 9,
  VUSD: 6,
};
