/** 附件 */
export interface Attachment {
  readonly id: string;
  readonly filingId: string;
  readonly filename: string;
  readonly filePath: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly uploadedBy: string;
  readonly createdAt: Date;
}
