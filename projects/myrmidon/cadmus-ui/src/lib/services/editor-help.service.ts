import { Injectable, inject } from '@angular/core';

import { EnvService } from '@myrmidon/ngx-tools';
import { FragmentIdentity, PartIdentity } from '@myrmidon/cadmus-core';

/**
 * The values used to fill a help URL template.
 */
export interface HelpUrlParams {
  /**
   * The model type ID: the part type ID for parts, or the fragment type ID
   * for fragments (e.g. `fr.it.vedph.comment`).
   */
  typeId: string;
  /**
   * The part role ID. This is always empty for fragments, because the role
   * of a layer part is just the fragment type ID.
   */
  roleId?: string | null;
  /**
   * The fragment role ID (fragments only).
   */
  frRoleId?: string | null;
  /**
   * The help language code (e.g. `it`), used for the `{language}`
   * placeholder. Empty for the default (non-localized) help.
   */
  language?: string | null;
}

/**
 * The default separator used for the `{separator}` placeholder.
 */
export const DEFAULT_HELP_URL_SEPARATOR = '__';

/**
 * The value of the `helpUrlLanguage` setting which means: use the
 * language of the browser.
 */
export const AUTO_HELP_URL_LANGUAGE = 'auto';

/**
 * Get the help URL parameters from the specified part or fragment identity.
 *
 * @param identity The part or fragment identity.
 * @returns Parameters, or null if no type ID is available.
 */
export function getHelpUrlParams(
  identity?: PartIdentity | FragmentIdentity | null
): HelpUrlParams | null {
  if (!identity) {
    return null;
  }
  // fragment: typeId is empty and roleId is just the fragment type ID
  if ('frTypeId' in identity && identity.frTypeId) {
    return {
      typeId: identity.frTypeId,
      frRoleId: identity.frRoleId || null,
    };
  }
  if (!identity.typeId) {
    return null;
  }
  return {
    typeId: identity.typeId,
    roleId: identity.roleId || null,
  };
}

/**
 * Parse the value of the `helpUrlTemplate` setting into a list of
 * templates, in their search order. The value can be either an array of
 * strings, or a string with one or more templates separated by whitespace
 * (URLs cannot contain unencoded whitespace, so this is unambiguous; it is
 * handy when `env.js` is generated from environment variables, which are
 * plain strings). Empty entries are ignored.
 *
 * @param value The setting value.
 * @returns Templates, empty if none.
 */
export function parseHelpUrlTemplates(value: unknown): string[] {
  const items: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\s+/)
      : [];
  return items
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Normalize a language code: trim it, replace underscores with hyphens
 * (e.g. `en_US`), and lowercase it. BCP47 tags are case-insensitive, while
 * URLs usually are not, so a single canonical form is used for URLs.
 *
 * @param code The language code.
 * @returns Normalized code, or null if empty or invalid.
 */
export function normalizeHelpLanguage(code?: string | null): string | null {
  const s = (code || '').trim().replace(/_/g, '-').toLowerCase();
  // one or more 1-8 alphanumeric subtags separated by hyphens
  return /^[a-z0-9]{1,8}(-[a-z0-9]{1,8})*$/.test(s) ? s : null;
}

/**
 * Get the language codes to try for the specified language, from the most
 * specific to the least specific, by truncating subtags as in the BCP47
 * lookup algorithm (RFC 4647 3.4): e.g. `zh-Hant-TW` gives `zh-hant-tw`,
 * `zh-hant`, `zh`. A single-character subtag (an extension or private use
 * singleton) left at the end is removed together with the following one.
 *
 * @param code The language code.
 * @returns Codes (normalized), empty if no valid code.
 */
export function getHelpLanguageFallbacks(code?: string | null): string[] {
  const normalized = normalizeHelpLanguage(code);
  if (!normalized) {
    return [];
  }
  const codes: string[] = [];
  const subtags = normalized.split('-');
  while (subtags.length) {
    codes.push(subtags.join('-'));
    subtags.pop();
    while (subtags.length && subtags[subtags.length - 1].length === 1) {
      subtags.pop();
    }
  }
  return codes;
}

/**
 * Resolve the value of the `helpUrlLanguage` setting into a language code.
 *
 * @param setting The setting: a language code, `auto` for the browser
 * language, or empty for no language.
 * @param browserLanguage The browser language (used for `auto`).
 * @returns The normalized language code, or null if none.
 */
export function resolveHelpLanguage(
  setting?: string | null,
  browserLanguage?: string | null
): string | null {
  const s = (setting || '').trim();
  if (!s) {
    return null;
  }
  return normalizeHelpLanguage(
    s.toLowerCase() === AUTO_HELP_URL_LANGUAGE ? browserLanguage : s
  );
}

const PLACEHOLDER_REGEX = /\{([a-zA-Z]+)\}/g;

/**
 * Fill a help URL template. The template can contain:
 * - placeholders in braces: `{typeId}`, `{roleId}`, `{frRoleId}`,
 * `{language}` and `{separator}`. Their values are URI-encoded; a missing
 * value is replaced with an empty string.
 * - optional groups in square brackets, e.g. `[__{roleId}]`, `[#{roleId}]`
 * or `[-{language}]`: a group is output (without brackets) only when all
 * the placeholders it contains have a value; else it is dropped as a whole.
 * Groups cannot be nested.
 * - `{separator}` immediately followed by another placeholder, e.g.
 * `{separator}{roleId}`: this is a shortcut for the optional group
 * `[{separator}{roleId}]`, so the separator is dropped together with the
 * following placeholder when it has no value.
 *
 * @param template The template.
 * @param params The parameters.
 * @param separator The separator value for `{separator}`.
 * @returns The URL.
 */
export function fillHelpUrlTemplate(
  template: string,
  params: HelpUrlParams,
  separator = DEFAULT_HELP_URL_SEPARATOR
): string {
  const getValue = (name: string): string => {
    if (name === 'separator') {
      return separator;
    }
    const value = (params as unknown as Record<string, unknown>)[name];
    return value ? encodeURIComponent(String(value)) : '';
  };
  const fill = (s: string) =>
    s.replace(PLACEHOLDER_REGEX, (_, n) => getValue(n));

  return (
    template
      // {separator}{name} => [{separator}{name}]
      .replace(/\{separator\}(\{[a-zA-Z]+\})/g, '[{separator}$1]')
      // optional groups
      .replace(/\[([^[\]]*)\]/g, (_, group: string) => {
        for (const m of group.matchAll(PLACEHOLDER_REGEX)) {
          if (!getValue(m[1])) {
            return '';
          }
        }
        return fill(group);
      })
      .replace(PLACEHOLDER_REGEX, (_, n) => getValue(n))
  );
}

/**
 * Build the list of candidate help URLs for the specified parameters, in
 * their search order. The rule is: the most relevant content wins, and
 * language is preferred only among equally relevant pages. So:
 * 1. templates are tried in their order (e.g. the project-specific help
 * site first, then the general-purpose one): a page found with an earlier
 * template always wins over the pages of later templates;
 * 2. for each template, topics are tried from the most specific to the
 * least specific: first with all the parameters, then without `frRoleId`,
 * then without `roleId`;
 * 3. for each topic, each of the specified languages is tried in its
 * order, and finally no language (the default help).
 * Duplicate URLs are removed (e.g. when a template has no `{language}`).
 *
 * @param templates The URL template(s), in their search order.
 * @param params The parameters. Their language, if any, is ignored: use
 * `languages` instead.
 * @param separator The separator.
 * @param languages The language codes to try in their order, before
 * falling back to no language.
 * @returns Candidate URLs.
 */
export function buildHelpUrlCandidates(
  templates: string | string[],
  params: HelpUrlParams,
  separator = DEFAULT_HELP_URL_SEPARATOR,
  languages: string[] = []
): string[] {
  const topics: HelpUrlParams[] = [
    params,
    { ...params, frRoleId: null },
    { ...params, frRoleId: null, roleId: null },
  ];
  const langs: (string | null)[] = [...languages.filter((l) => l), null];
  const urls: string[] = [];

  for (const template of Array.isArray(templates) ? templates : [templates]) {
    for (const topic of topics) {
      for (const language of langs) {
        urls.push(
          fillHelpUrlTemplate(template, { ...topic, language }, separator)
        );
      }
    }
  }
  return [...new Set(urls)];
}

/**
 * Service used to resolve the URL of the help page for a part or fragment
 * editor. It is configured via these environment variables (`env.js`):
 * - `helpUrlTemplate`: the URL template (see `fillHelpUrlTemplate`), or an
 * array of templates in their search order (see `parseHelpUrlTemplates`).
 * When not set, no help is available.
 * - `helpUrlSeparator`: the value of the `{separator}` placeholder
 * (default `__`).
 * - `helpUrlLanguage`: the value of the `{language}` placeholder: a
 * language code (e.g. `it`), or `auto` for the browser language. When not
 * set, `{language}` is always empty. Localized pages are tried first,
 * falling back to non-localized ones (see `buildHelpUrlCandidates`).
 * - `helpUrlCheck`: set to false to skip the availability check and always
 * use the first candidate URL. Use this when the help site does not allow
 * cross-origin requests (CORS), which are required for checking.
 */
@Injectable({ providedIn: 'root' })
export class EditorHelpService {
  private readonly _env = inject(EnvService);
  private readonly _cache = new Map<string, Promise<boolean>>();

  // env.js values are not necessarily strings (e.g. arrays, booleans)
  private getSetting(key: string): unknown {
    return this._env.get(key) as unknown;
  }

  /**
   * Get the language codes to try for help pages, from the most specific
   * to the least specific, according to the `helpUrlLanguage` setting.
   * Override this to get the language from another source (e.g. the
   * app's own language setting).
   *
   * @returns Language codes, empty if none.
   */
  protected getLanguages(): string[] {
    const setting = this.getSetting('helpUrlLanguage');
    return getHelpLanguageFallbacks(
      resolveHelpLanguage(
        typeof setting === 'string' ? setting : null,
        typeof navigator !== 'undefined' ? navigator.language : null
      )
    );
  }

  /**
   * Get the candidate help URLs for the specified identity, in their
   * search order (see `buildHelpUrlCandidates`).
   *
   * @param identity The part or fragment identity.
   * @returns Candidate URLs, empty if help is not configured.
   */
  public getCandidates(
    identity?: PartIdentity | FragmentIdentity | null
  ): string[] {
    const templates = parseHelpUrlTemplates(
      this.getSetting('helpUrlTemplate')
    );
    const params = getHelpUrlParams(identity);
    if (!templates.length || !params) {
      return [];
    }
    const separator = this.getSetting('helpUrlSeparator');
    return buildHelpUrlCandidates(
      templates,
      params,
      typeof separator === 'string' ? separator : DEFAULT_HELP_URL_SEPARATOR,
      this.getLanguages()
    );
  }

  /**
   * Resolve the help URL for the specified identity, by trying each
   * candidate URL in their search order (see `buildHelpUrlCandidates`).
   *
   * @param identity The part or fragment identity.
   * @returns Promise with the first available URL, or undefined.
   */
  public async resolveUrl(
    identity?: PartIdentity | FragmentIdentity | null
  ): Promise<string | undefined> {
    const candidates = this.getCandidates(identity);
    if (!candidates.length) {
      return undefined;
    }
    if (String(this.getSetting('helpUrlCheck')) === 'false') {
      return candidates[0];
    }

    for (const url of candidates) {
      if (await this.isAvailable(url)) {
        return url;
      }
    }
    console.info(
      `No help page found for ${
        getHelpUrlParams(identity)?.typeId
      }. Tried: ${candidates.join(', ')}`
    );
    return undefined;
  }

  /**
   * Check whether the specified URL is available. Results are cached,
   * so that each URL is checked only once.
   *
   * @param url The URL.
   * @returns Promise with true if available.
   */
  public isAvailable(url: string): Promise<boolean> {
    let result = this._cache.get(url);
    if (!result) {
      result = this.checkUrl(url);
      this._cache.set(url, result);
    }
    return result;
  }

  /**
   * Check the specified URL. The native fetch API is used rather than
   * HttpClient, so that app interceptors (e.g. the JWT one) do not send
   * credentials to the external help site.
   */
  protected async checkUrl(url: string): Promise<boolean> {
    try {
      let response = await fetch(url, { method: 'HEAD' });
      // some servers do not support HEAD
      if (response.status === 405 || response.status === 501) {
        response = await fetch(url);
      }
      return response.ok;
    } catch {
      // network or CORS error
      return false;
    }
  }
}
