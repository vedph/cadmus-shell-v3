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
}

/**
 * The default separator used for the `{separator}` placeholder.
 */
export const DEFAULT_HELP_URL_SEPARATOR = '__';

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

const PLACEHOLDER_REGEX = /\{([a-zA-Z]+)\}/g;

/**
 * Fill a help URL template. The template can contain:
 * - placeholders in braces: `{typeId}`, `{roleId}`, `{frRoleId}`, and
 * `{separator}`. Their values are URI-encoded; a missing value is replaced
 * with an empty string.
 * - optional groups in square brackets, e.g. `[__{roleId}]` or
 * `[#{roleId}]`: a group is output (without brackets) only when all the
 * placeholders it contains have a value; else it is dropped as a whole.
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
  const fill = (s: string) => s.replace(PLACEHOLDER_REGEX, (_, n) => getValue(n));

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
 * Build the list of candidate help URLs for the specified parameters,
 * from the most specific to the least specific: first with all the
 * parameters, then without `frRoleId`, then without `roleId`.
 * Duplicate URLs are removed.
 *
 * @param template The URL template.
 * @param params The parameters.
 * @param separator The separator.
 * @returns Candidate URLs.
 */
export function buildHelpUrlCandidates(
  template: string,
  params: HelpUrlParams,
  separator = DEFAULT_HELP_URL_SEPARATOR
): string[] {
  const urls = [
    fillHelpUrlTemplate(template, params, separator),
    fillHelpUrlTemplate(template, { ...params, frRoleId: null }, separator),
    fillHelpUrlTemplate(
      template,
      { ...params, frRoleId: null, roleId: null },
      separator
    ),
  ];
  return [...new Set(urls)];
}

/**
 * Service used to resolve the URL of the help page for a part or fragment
 * editor. It is configured via these environment variables (`env.js`):
 * - `helpUrlTemplate`: the URL template (see `fillHelpUrlTemplate`). When
 * not set, no help is available.
 * - `helpUrlSeparator`: the value of the `{separator}` placeholder
 * (default `__`).
 * - `helpUrlCheck`: set to false to skip the availability check and always
 * use the most specific URL. Use this when the help site does not allow
 * cross-origin requests (CORS), which are required for checking.
 */
@Injectable({ providedIn: 'root' })
export class EditorHelpService {
  private readonly _env = inject(EnvService);
  private readonly _cache = new Map<string, Promise<boolean>>();

  /**
   * Resolve the help URL for the specified identity, by trying each
   * candidate URL from the most specific to the least specific.
   *
   * @param identity The part or fragment identity.
   * @returns Promise with the first available URL, or undefined.
   */
  public async resolveUrl(
    identity?: PartIdentity | FragmentIdentity | null
  ): Promise<string | undefined> {
    const template = this._env.get('helpUrlTemplate');
    const params = getHelpUrlParams(identity);
    if (!template || !params) {
      return undefined;
    }
    const candidates = buildHelpUrlCandidates(
      template,
      params,
      this._env.get('helpUrlSeparator') ?? DEFAULT_HELP_URL_SEPARATOR
    );
    if (String(this._env.get('helpUrlCheck')) === 'false') {
      return candidates[0];
    }

    for (const url of candidates) {
      if (await this.isAvailable(url)) {
        return url;
      }
    }
    console.info(
      `No help page found for ${params.typeId}. Tried: ${candidates.join(
        ', '
      )}`
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
