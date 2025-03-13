// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Use the CCF polyfill to mock-up all key-value map functionality for unit-test
import "@microsoft/ccf-app/polyfill.js";
import { describe, expect, jest, test } from "@jest/globals";
import { Settings } from "../../../src/policies/Settings";
import { LogContext, Logger, LogLevel } from "../../../src/utils/Logger";
import { ServiceRequest } from "../../../src/utils/ServiceRequest";

interface Request {
    headers: {
        ":authority": string;
        ":method": string;
        ":path": string;
        ":scheme": string;
        "content-type": string;
        authorization?: string; // Optional field for the Authorization header
    };
    query: string;
    path: string;
    method: string;
    hostname: string | null;
    route: string;
    url: string;
    params: Record<string, any>;
    body: {
        json: () => any; // Mock the .json() method
    };
}

describe("Test ServiceRequest properties", () => {

    test("Should not log bearer token", () => {
        // Arrange
        const settings = Settings.defaultSettings();
        settings.service.debug = true;
        Logger.setLogLevel(LogLevel.DEBUG);
        const logContext = new LogContext().appendScope("ServiceRequest");
        logContext.setRequestId("req")
        const request: Request = {
            headers: {
                ":authority": "127.0.0.1:8000",
                ":method": "POST",
                ":path": "/app/key",
                ":scheme": "https",
                "content-type": "application/json",
                authorization: "Bearer some-token",
            },
            query: "",
            path: "/app/key",
            method: "POST",
            hostname: null,
            route: "/app/key",
            url: "/app/key",
            params: {},
            body: {
                json: () => ({
                    key: "value",
                }),
            },
        };

        // Set settings policy
        const settingsPolicyMap = globalThis.ccf.kv["public:policies.settings"];
        settingsPolicyMap.clear();
        const settingsPolicyValue = globalThis.ccf.strToBuf(JSON.stringify({
            service: {
                name: "azure-privacy-sandbox-kms",
                description: "Key Management Service",
                version: "10.0.0",
                debug: true
            }
        }));
        settingsPolicyMap.set("settings_policy", settingsPolicyValue);

        // Mock Logger.debug
        const debugSpy = jest.spyOn(console, "log").mockImplementation(() => true);

        // Act
        const serviceRequest =
            new ServiceRequest<void>(logContext, <any>request);
        // Dump all messages received by debugSpy
        console.dir(debugSpy.mock.calls, { depth: null });

        // Assert
        expect(serviceRequest.error).toBeUndefined();
        expect(debugSpy).toHaveBeenCalledWith(
            `[INFO] [requestId=req,scope=ServiceRequest->loadSettingsFromMap] Loading settings from map: {\"map\":{}}`,
        );
        expect(debugSpy).toHaveBeenCalledWith(
            `[DEBUG] [requestId=req,scope=ServiceRequest->loadSettingsFromMap] Loading settings: {\"service\":{\"name\":\"azure-privacy-sandbox-kms\",\"description\":\"Key Management Service\",\"version\":\"10.0.0\",\"debug\":true}}`,
        );
        expect(debugSpy).toHaveBeenCalledWith(
            `Setting log level (DEBUG) to DEBUG`,
        );
        expect(debugSpy).toHaveBeenCalledWith(
            `[DEBUG] [scope=Settings] Service Name: ${settings.service.name}`,
        );
        expect(debugSpy).toHaveBeenCalledWith(
            `[DEBUG] [scope=Settings] Service Description: ${settings.service.description}`,
        );
        expect(debugSpy).toHaveBeenCalledWith(
            `[DEBUG] [scope=Settings] Service Version: 10.0.0`,
        );
        expect(debugSpy).toHaveBeenCalledWith(
            `[DEBUG] [scope=Settings] Debug: true`,
        );
        expect(debugSpy).toHaveBeenCalledWith(
            `[INFO] [requestId=req,scope=ServiceRequest] ServiceRequest`,
        );

        const expectedLogMessageWithoutBearer = `[DEBUG] [requestId=req,scope=ServiceRequest] Request: {\n` +
            '  "headers": {\n' +
            '    ":authority": "127.0.0.1:8000",\n' +
            '    ":method": "POST",\n' +
            '    ":path": "/app/key",\n' +
            '    ":scheme": "https",\n' +
            '    "content-type": "application/json",\n' +
            '    "authorization": "token deleted for logging"\n' +
            '  },\n' +
            '  "query": "",\n' +
            '  "path": "/app/key",\n' +
            '  "method": "POST",\n' +
            '  "hostname": null,\n' +
            '  "route": "/app/key",\n' +
            '  "url": "/app/key",\n' +
            '  "params": {},\n' +
            '  "body": {\n' +
            '    "key": "value"\n' +
            '  }\n' +
            '}';
        expect(debugSpy).toHaveBeenCalledWith(expectedLogMessageWithoutBearer);

        // Clean up
        debugSpy.mockRestore();
    });
});
