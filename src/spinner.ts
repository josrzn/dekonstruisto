export class Spinner {
  private readonly enabled: boolean;
  private readonly stream: NodeJS.WriteStream;
  private readonly frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private frameIndex = 0;
  private timer?: NodeJS.Timeout;
  private text = "";

  constructor(enabled: boolean, stream: NodeJS.WriteStream = process.stderr) {
    this.enabled = enabled;
    this.stream = stream;
  }

  start(text: string): void {
    this.text = text;

    if (!this.enabled) {
      return;
    }

    this.render();
    this.timer = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this.render();
    }, 80);
  }

  update(text: string): void {
    this.text = text;

    if (!this.enabled) {
      return;
    }

    this.render();
  }

  stop(finalText?: string): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    if (!this.enabled) {
      return;
    }

    this.clearLine();
    if (finalText) {
      this.stream.write(`${finalText}\n`);
    }
  }

  private render(): void {
    this.clearLine();
    const frame = this.frames[this.frameIndex] ?? this.frames[0];
    this.stream.write(`${frame} ${this.text}`);
  }

  private clearLine(): void {
    this.stream.write("\r\u001b[2K");
  }
}
