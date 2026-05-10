export interface WhoisResponse {
  time: number;
  status: boolean;
  cached?: boolean;
  source?: string;
  code?: string;
  error?: string;
  result?: WhoisResult;
}

export interface WhoisResult {
  domain?: string;
  registrar?: string;
  whoisServer?: string;
  rawWhoisContent?: string;
  creationDate?: string;
  expirationDate?: string;
  updatedDate?: string;
  nameServers?: string[];
  status?: Array<string | WhoisStatusItem>;
  domainStatus?: Array<string | WhoisStatusItem>;
  dnssec?: string;
  registrant?: RegistrantInfo;
  admin?: RegistrantInfo;
  tech?: RegistrantInfo;
  billing?: RegistrantInfo;
  [key: string]: unknown;
}

export interface WhoisStatusItem {
  status?: string;
  url?: string;
  [key: string]: unknown;
}

export interface RegistrantInfo {
  name?: string;
  organization?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  street?: string;
  [key: string]: unknown;
}

export interface QueryRecord {
  id: string;
  query: string;
  timestamp: number;
  status: boolean;
  result?: WhoisResult;
  error?: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: UserInfo;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface HistoryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface HistoryResult {
  total: number;
  records: QueryRecord[];
}
