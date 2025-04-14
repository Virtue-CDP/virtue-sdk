export type BucketProtocolResponse = {
  dataType: string;
  type: string;
  hasPublicTransfer: boolean;
  fields: {
    buck_treasury_cap: {
      type: string;
      fields: {
        id: {
          id: string;
        };
        total_supply: {
          type: string;
          fields: {
            value: string;
          };
        };
      };
    };
    id: {
      id: string;
    };
    min_bottle_size: string;
    version: string;
  };
};

export type BucketResponse = {
  base_fee_rate: string;
  bottle_table: {
    type: string;
    fields: {
      debt_per_unit_stake: string;
      id: {
        id: string;
      };
      reward_per_unit_stake: string;
      table: {
        type: string;
        fields: {
          head: string;
          id: {
            id: string;
          };
          size: string;
          tail: string;
        };
      };
      total_collateral_snapshot: string;
      total_stake: string;
      total_stake_snapshot: string;
    };
  };
  collateral_decimal: number;
  collateral_vault: string;
  id: {
    id: string;
  };
  surplus_bottle_table: {
    fields: {
      id: {
        id: string;
      };
    };
  };
  latest_redemption_time: string;
  max_mint_amount: string;
  min_collateral_ratio: string;
  minted_buck_amount: string;
  min_bottle_size: string;
  recovery_mode_threshold: string;
  total_flash_loan_amount: string;
};
