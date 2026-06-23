import { IsBoolean, IsNumber, IsString, Min } from 'class-validator';

export class SubmitCountDto {
  @IsString()
  scannedBarcode: string;

  @IsBoolean()
  barcodeValidated: boolean;

  @IsNumber()
  @Min(0)
  countedQty: number;
}
