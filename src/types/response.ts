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
  type: string;
  fields: {
    coll_amount: string;
    debt_amount: string;
    interest_buffer: string;
    interest_unit: {
      type: string;
      fields: {
        value: string;
      };
    };
  };
};

export type PriceMapResponse = {
  type: string;
  price_map: {
    type: string;
    fields: {
      contents: PriceObjResponse[];
    };
  };
};

export type PriceObjResponse = {
  type: string;
  fields: {
    key: {
      type: string;
      fields: {
        name: string;
      };
    };
    value: {
      type: string;
      fields: {
        value: string;
      };
    };
  };
};

export type StabilityPoolResponse = { balance: string };
