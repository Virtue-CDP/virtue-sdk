import {
  IotaMoveObject,
  IotaObjectData,
  IotaObjectResponse,
  IotaParsedData,
} from "@iota/iota-sdk/client";
import type { Infer } from "superstruct";
import { any, record, string } from "superstruct";

export const ObjectContentFields = record(string(), any());
export type ObjectContentFields = Infer<typeof ObjectContentFields>;

export interface IotaObjectDataWithContent extends IotaObjectData {
  content: IotaParsedData;
}

function isIotaObjectDataWithContent(
  data: IotaObjectData,
): data is IotaObjectDataWithContent {
  return data.content !== undefined;
}

export function getIotaObjectData(
  resp: IotaObjectResponse,
): IotaObjectData | null | undefined {
  return resp.data;
}

export function getMoveObject(
  data: IotaObjectResponse | IotaObjectData,
): IotaMoveObject | undefined {
  const obj =
    "data" in data ? getIotaObjectData(data) : (data as IotaObjectData);

  if (
    !obj ||
    !isIotaObjectDataWithContent(obj) ||
    obj.content.dataType !== "moveObject"
  ) {
    return undefined;
  }

  return obj.content as IotaMoveObject;
}

export function getObjectFields(
  resp: IotaObjectResponse | IotaMoveObject | IotaObjectData,
): ObjectContentFields | undefined {
  if ("fields" in resp) {
    return resp.fields;
  }

  return getMoveObject(resp)?.fields;
}

export const getObjectGenerics = (resp: IotaObjectResponse): string[] => {
  const objType = resp.data?.type;

  const startIdx = objType?.indexOf?.("<");
  const endIdx = objType?.lastIndexOf?.(">");

  return startIdx ? objType!.slice(startIdx + 1, endIdx).split(", ") : [];
};
