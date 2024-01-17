import { Base64 } from "js-base64";
// Does not work in CCF because of the lack of support for promises
export class LoadPolicy {
  // singleton class
  private static _instance: LoadPolicy;
  private loading: boolean = false;
  public ready: boolean = true;
  public loadError: Error | undefined;
  public loadedModule: any | undefined;

  public static get instance(): LoadPolicy {
    return this._instance || (this._instance = new LoadPolicy());
  }

  public load(moduleString: string): void {
    this.loading = true;
    this.ready = false;
    console.log(`Start loading policy: ${moduleString}`);
    const base64Buf = Base64.btoa(moduleString);
    import(`data:text/javascript;base64,${base64Buf}`)
      .then((module: any) => {
        console.log(`Policy loaded: ${moduleString}`);
        this.loadedModule = module;
        this.loadError = undefined;
        this.loading = false;
        this.ready = true;
      })
      .catch((reason: any) => {
        console.log(`Policy load error: ${reason?.message}`);
        this.loadError = reason;
        this.loading = false;
        this.loadedModule = undefined;
        this.ready = true;
      })
      .finally(() => {
        console.log(
          `Policy load finalized: loading: ${this.loading}, ready: ${
            this.ready
          }, module: ${JSON.stringify(
            this.loadedModule,
          )}, load error: ${JSON.stringify(this.loadError)}`,
        );
      });
  }

  public readyToLoad(): boolean {
    if (
      this.isError() === false &&
      this.loading === false &&
      this.ready === true
    ) {
      return true;
    }
    return false;
  }

  public busy(): boolean {
    if (this.loadError) {
      return true;
    }

    return this.loading && !this.ready;
  }

  public moduleIsLoaded(): boolean | any {
    if (!this.readyToLoad() && this.isError() === false && this.ready) {
      return this.Module();
    }
    return false;
  }

  public isError(): boolean | Error {
    if (this.loadError) {
      return this.loadError as Error;
    }
    return false;
  }

  private Module() {
    if (this.isError() || !this.ready) {
      return undefined;
    }
    if (this.loadedModule) {
      return this.loadedModule;
    }
    return undefined;
  }
}
