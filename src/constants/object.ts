export const CORE_PACKAGE_ID =
  "0x0b6ba9889bb71abc5fa89e4ad5db12e63bc331dba858019dd8d701bc91184d79";
export const BUCKET_OPERATIONS_PACKAGE_ID: string =
  "0x50e0e9e549574c2ab7ee24d37bffd38eaeb2e93e83bcac26aac081606ac68fae";
export const PROTOCOL_ID =
  "0x9e3dab13212b27f5434416939db5dec6a319d15b89a84fd074d03ece6350d3df";
export const CONTRIBUTOR_TOKEN_ID =
  "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2";

export const CLOCK_OBJECT = {
  objectId:
    "0x0000000000000000000000000000000000000000000000000000000000000006",
  mutable: false,
  initialSharedVersion: 1,
};

export const ORACLE_OBJECT = {
  objectId:
    "0xf578d73f54b3068166d73c1a1edd5a105ce82f97f5a8ea1ac17d53e0132a1078",
  mutable: true,
  initialSharedVersion: 5174506,
};

export const PROTOCOL_OBJECT = {
  objectId: PROTOCOL_ID,
  mutable: true,
  initialSharedVersion: 6365975,
};
