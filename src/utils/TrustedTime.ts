export class TrustedTime {
  private static lastTimestamp: number = 0;

  public static getCurrentTime(): number {
    const currentTime = Date.now();
    if (currentTime <= this.lastTimestamp) {
      throw new Error("System time moved backwards.");
    }
    this.lastTimestamp = currentTime;
    return currentTime;
  }
}
