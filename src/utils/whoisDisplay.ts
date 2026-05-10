import type { WhoisResult } from '@/types/whois';

export interface WhoisDisplayField {
  key: string;
  label: string;
  value: string | string[];
  variant?: 'tags';
}

export interface WhoisDisplayBlock {
  title?: string;
  fields: WhoisDisplayField[];
}

export interface WhoisDisplaySection {
  key: string;
  title: string;
  blocks: WhoisDisplayBlock[];
}

type ContactPrefix = 'registrant' | 'admin' | 'tech' | 'billing';

const PLACEHOLDER_VALUES = new Set(['unknown', 'n/a', 'invalid date']);
const NUMBER_SENTINELS: Record<string, number[]> = {
  mozDomainAuthority: [-1],
  mozPageAuthority: [-1],
  mozSpamScore: [-1],
};

const FIELD_LABELS: Record<string, string> = {
  domain: '域名',
  registrar: '注册商',
  registrarURL: '注册商 URL',
  ianaId: 'IANA ID',
  whoisServer: 'WHOIS 服务器',
  domainReserved: '保留域名',
  domainNotFound: '域名未注册',
  creationDate: '创建时间',
  expirationDate: '到期时间',
  updatedDate: '更新时间',
  freeDate: '释放时间',
  domainAge: '域名年龄',
  remainingDays: '剩余天数',
  dnssec: 'DNSSEC',
  nameServers: '名称服务器',
  status: '域名状态',
  domainStatus: '域名状态',
  registerPrice: '注册价格',
  renewPrice: '续费价格',
  transferPrice: '转移价格',
  cidr: 'CIDR',
  inetNum: 'inetNum',
  inet6Num: 'inet6Num',
  netRange: '网络范围',
  netName: '网络名称',
  netType: '网络类型',
  originAS: 'Origin AS',
  mozDomainAuthority: '域名权重',
  mozPageAuthority: '页面权重',
  mozSpamScore: '垃圾分值',
};

const CONTACT_BLOCK_TITLES: Record<ContactPrefix, string> = {
  registrant: '注册人',
  admin: '管理联系人',
  tech: '技术联系人',
  billing: '账单联系人',
};

const CONTACT_FIELD_LABELS: Record<string, string> = {
  name: '姓名',
  organization: '组织',
  organizationEn: '组织(英文)',
  email: '邮箱',
  phone: '电话',
  country: '国家/地区',
  province: '省份',
  city: '城市',
  street: '街道',
  type: '类型',
  handle: 'Handle',
};

const SECTION_CONFIG = [
  {
    key: 'domain',
    title: '域名信息',
    fields: ['domain', 'registrar', 'registrarURL', 'ianaId', 'whoisServer', 'domainReserved', 'domainNotFound'],
  },
  {
    key: 'time',
    title: '时间信息',
    fields: ['creationDate', 'expirationDate', 'updatedDate', 'freeDate', 'domainAge', 'remainingDays'],
  },
  {
    key: 'dns',
    title: 'DNS 信息',
    fields: ['dnssec', 'nameServers'],
  },
  {
    key: 'prices',
    title: '价格信息',
    fields: ['registerPrice', 'renewPrice', 'transferPrice'],
  },
  {
    key: 'network',
    title: '网络信息',
    fields: ['cidr', 'inetNum', 'inet6Num', 'netRange', 'netName', 'netType', 'originAS'],
  },
  {
    key: 'metrics',
    title: '指标信息',
    fields: ['mozDomainAuthority', 'mozPageAuthority', 'mozSpamScore'],
  },
] as const;

function isPlaceholderString(value: string): boolean {
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

function isMeaningfulValue(key: string, value: unknown): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return !isPlaceholderString(trimmed);
  }

  if (typeof value === 'number') {
    const sentinels = NUMBER_SENTINELS[key];
    if (sentinels?.includes(value)) return false;
    return true;
  }

  if (typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.values(value).some((item) => isMeaningfulValue(key, item));
  }

  return true;
}

function formatDateValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDisplayText(key: string, value: unknown): string {
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (key.endsWith('Date')) {
      return formatDateValue(value);
    }
    return value;
  }
  return String(value);
}

function extractDomainStatus(result: WhoisResult): string[] {
  const source = result.status ?? result.domainStatus;
  if (!Array.isArray(source)) return [];

  return source
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }

      if (!item || typeof item !== 'object') {
        return '';
      }

      const status = typeof item.status === 'string' ? item.status.trim() : '';
      const url = typeof item.url === 'string' ? item.url.trim() : '';

      if (status && url && !/^https?:\/\//i.test(url)) {
        return `${status} ${url}`.trim();
      }

      return status || url;
    })
    .filter((item) => item && !isPlaceholderString(item));
}

function extractStringArray(key: string, value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item === null || item === undefined) return '';
      return String(item).trim();
    })
    .filter((item) => item && !isPlaceholderString(item));
}

function buildStandardField(key: string, result: WhoisResult): WhoisDisplayField | null {
  if (key === 'status' || key === 'domainStatus') {
    const values = extractDomainStatus(result);
    if (!values.length) return null;
    return {
      key,
      label: FIELD_LABELS[key],
      value: values,
      variant: 'tags',
    };
  }

  const rawValue = (result as Record<string, unknown>)[key];
  if (!isMeaningfulValue(key, rawValue)) return null;

  if (key === 'nameServers') {
    const values = extractStringArray(key, rawValue);
    if (!values.length) return null;
    return {
      key,
      label: FIELD_LABELS[key],
      value: values,
      variant: 'tags',
    };
  }

  return {
    key,
    label: FIELD_LABELS[key] ?? key,
    value: toDisplayText(key, rawValue),
  };
}

function toCamelCaseLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function normalizeContactFieldKey(prefix: ContactPrefix, key: string): string {
  if (key.toLowerCase().startsWith(prefix)) {
    const trimmed = key.slice(prefix.length);
    if (!trimmed) return key;
    return trimmed[0].toLowerCase() + trimmed.slice(1);
  }

  return key;
}

function resolveContactFieldLabel(prefix: ContactPrefix, key: string): string {
  const normalized = normalizeContactFieldKey(prefix, key);
  return CONTACT_FIELD_LABELS[normalized] ?? toCamelCaseLabel(normalized);
}

function buildContactBlock(result: WhoisResult, prefix: ContactPrefix): WhoisDisplayBlock | null {
  const nestedValue = (result as Record<string, unknown>)[prefix];
  const fieldMap = new Map<string, WhoisDisplayField>();

  if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
    Object.entries(nestedValue).forEach(([key, value]) => {
      if (!isMeaningfulValue(key, value)) return;

      const fieldKey = `${prefix}.${key}`;
      fieldMap.set(fieldKey, {
        key: fieldKey,
        label: resolveContactFieldLabel(prefix, key),
        value: toDisplayText(key, value),
      });
    });
  }

  Object.entries(result).forEach(([key, value]) => {
    if (!key.toLowerCase().startsWith(prefix) || key === prefix) return;
    if (!isMeaningfulValue(key, value)) return;

    const normalized = normalizeContactFieldKey(prefix, key);
    const blockKey = `${prefix}.${normalized}`;

    if (fieldMap.has(blockKey)) return;

    fieldMap.set(blockKey, {
      key: blockKey,
      label: resolveContactFieldLabel(prefix, key),
      value: toDisplayText(key, value),
    });
  });

  const fields = Array.from(fieldMap.values());
  if (!fields.length) return null;

  return {
    title: CONTACT_BLOCK_TITLES[prefix],
    fields,
  };
}

function buildRegistrantSection(result: WhoisResult): WhoisDisplaySection | null {
  const blocks = (['registrant', 'admin', 'tech', 'billing'] as const)
    .map((prefix) => buildContactBlock(result, prefix))
    .filter((block): block is WhoisDisplayBlock => Boolean(block));

  if (!blocks.length) return null;

  return {
    key: 'registrant',
    title: '注册人信息',
    blocks,
  };
}

export function buildWhoisDisplaySections(result?: WhoisResult): WhoisDisplaySection[] {
  if (!result) return [];

  const sections: WhoisDisplaySection[] = [];

  SECTION_CONFIG.forEach((sectionConfig) => {
    const fields = sectionConfig.fields
      .map((field) => buildStandardField(field, result))
      .filter((field): field is WhoisDisplayField => Boolean(field));

    if (!fields.length) return;

    sections.push({
      key: sectionConfig.key,
      title: sectionConfig.title,
      blocks: [{ fields }],
    });
  });

  const statusField = buildStandardField('status', result) ?? buildStandardField('domainStatus', result);
  if (statusField) {
    const domainSection = sections.find((section) => section.key === 'domain');
    if (domainSection) {
      domainSection.blocks[0]?.fields.push(statusField);
    } else {
      sections.unshift({
        key: 'domain',
        title: '域名信息',
        blocks: [{ fields: [statusField] }],
      });
    }
  }

  const registrantSection = buildRegistrantSection(result);
  if (registrantSection) {
    const insertIndex = sections.findIndex((section) =>
      ['prices', 'network', 'metrics'].includes(section.key)
    );
    if (insertIndex === -1) {
      sections.push(registrantSection);
    } else {
      sections.splice(insertIndex, 0, registrantSection);
    }
  }

  return sections;
}

function formatCopyFieldLines(field: WhoisDisplayField): string[] {
  if (Array.isArray(field.value)) {
    return [`${field.label}：`, ...field.value.map((item) => `- ${item}`)];
  }

  return [`${field.label}：${field.value}`];
}

export function buildWhoisDisplayCopyText(result?: WhoisResult): string {
  const sections = buildWhoisDisplaySections(result);

  return sections
    .map((section) => {
      const lines = [section.title];

      section.blocks.forEach((block) => {
        if (block.title) {
          lines.push('', block.title);
        }

        block.fields.forEach((field) => {
          lines.push(...formatCopyFieldLines(field));
        });
      });

      return lines.join('\n');
    })
    .join('\n\n')
    .trim();
}
