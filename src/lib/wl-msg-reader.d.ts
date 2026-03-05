declare module 'wl-msg-reader' {
  interface MsgRecipient {
    name: string;
    email: string;
  }

  interface MsgFileData {
    subject: string;
    senderName: string;
    senderEmail: string;
    body: string;
    recipients: MsgRecipient[];
    compileTime: string;
    headers: string;
    [key: string]: unknown;
  }

  export class MSGReader {
    constructor(arrayBuffer: ArrayBuffer);
    getFileData(): MsgFileData;
  }

  const _default: {
    DataStream: unknown;
    MSGReader: typeof MSGReader;
  };
  export default _default;
}
