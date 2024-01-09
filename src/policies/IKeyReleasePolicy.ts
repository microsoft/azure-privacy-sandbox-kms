import { IKeyReleasePolicyProps } from "..";

export interface IKeyReleasePolicy {
    type: string;
    claims: IKeyReleasePolicyProps;
}