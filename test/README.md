# Testing Strategy

## Table of Contents

- [Introduction](#introduction)
- [Unit Testing](#unit-testing)
- [System Tests](#system-tests)
- [End to End Testing](#end-to-end-testing)

## Introduction

The purpose of this document is to describe how the application is being tested to assure quality and coverage.

The application testing strategy depends on two main types of testing to achieve the objective:

- Unit testing
- System tests
- End to end (e2e) testing

## Unit Testing

This type of testing covers main KMS functions.

The application is using the [`Jest Testing Framework`](https://jestjs.io/docs/getting-started) to define the unit-test scenarios.

### Build and run unit-test using jest framework

```bash
# In the terminal window
make unit-test
```


**NOTE**: To enable the CCF functionality on testing environment, the application is using built-in feature of CCF, [the Polyfill implementation](https://microsoft.github.io/CCF/main/js/ccf-app/modules/polyfill.html) which overrides the CCF modules' implementation to support testing and local environments

## System Tests

System tests involve testing the application's workflow from beginning to end. This method aims to replicate real user scenarios to validate the system for integration and data integrity.

The system test is based on [pytest](https://docs.pytest.org/en/stable/).

All system tests are ran in docker to assure a clean testing environment deployed with CCF.

### How to run system tests

```bash
# In the terminal window
make test-system-inference
```

## End to end testing

E2e testing is designed to quickly test if all endpoints are functional. This test run quickly and is intended to do a quick test after changes.

This can also be used to launch KMS. Next one can do manual curl tests to test the endpoints.

### How to run e2e tests

```bash
# In the terminal window
make demo
```