export type Float = { fields: { value: string } };

export type VaultResponse = {
  balance: string;
  decimal: number;
  min_debt_amount: string;
  limited_supply: {
    fields: {
      limit: string;
      supply: string;
    };
  };
  liquidation_config: {
    fields: {
      mcr: Float;
      ccr: Float;
      bcr: Float;
    };
  };
  position_table: {
    fields: {
      fee_rate: Float;
      interest_rate: Float;
      timestamp: number;
      table: {
        fields: {
          head: string | null;
          tail: string | null;
          id: { id: string };
          size: string;
        };
      };
    };
  };
  surplus_table: {
    fields: {
      id: { id: string };
      size: string;
    };
  };
};


export type PositionResponse = {
  coll_amount: string;
  debt_amount: string;
};
