import { IsString, IsNotEmpty, Matches } from 'class-validator';

export default class Base64File {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(
    /^data:([A-Za-z0-9]+\/[A-Za-z0-9\-\.]+);base64,[A-Za-z0-9\-_+=/]+$/,
    {
      message:
        'content must be a valid base64-encoded string with a valid data URI scheme',
    },
  )
  content: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;
}
