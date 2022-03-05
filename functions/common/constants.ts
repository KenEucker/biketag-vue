export enum ErrorMessage {
  NameTaken = 'profile name is already in use',
  ProfileInitialized = 'profile fields have already been initialized',
  InvalidRequestData = 'invalid request data',
  PatchFailed = 'profile update error',
  MethodNotAllowed = 'request method not allowed',
}

export enum InfoMessage {
  ProfileInit = 'intializing profile fields (name, role)',
}
