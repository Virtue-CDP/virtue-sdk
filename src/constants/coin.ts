import { COIN } from "@/types";

export const COIN_TYPES: Record<COIN, string> = {
  IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
  stIOTA:
    "0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT",
  VUSD: "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD",
};

export const COIN_DECIMALS: Record<COIN, number> = {
  IOTA: 9,
  stIOTA: 9,
  VUSD: 6,
};
