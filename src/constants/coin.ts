import { COIN } from "@/types";

export const COINS_TYPE_LIST: Record<COIN, string> = {
  IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
  stIOTA:
    "0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT",
  VUSD: "0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081::vusd::VUSD",
};

export const COIN_DECIMALS: Record<COIN, number> = {
  IOTA: 9,
  stIOTA: 9,
  VUSD: 6,
};
