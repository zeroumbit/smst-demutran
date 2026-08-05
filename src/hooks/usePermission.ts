import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermissionRpc } from '@/lib/permissions';

export function usePermission(codigo: string | null | undefined): boolean {
  const { isSuperAdmin } = useAuth();
  const [allowed, setAllowed] = useState<boolean>(!!isSuperAdmin && !!codigo);

  useEffect(() => {
    if (!codigo) {
      setAllowed(false);
      return;
    }
    if (isSuperAdmin) {
      setAllowed(true);
      return;
    }
    let active = true;
    setAllowed(false);
    hasPermissionRpc(codigo).then((result) => {
      if (active) {
        setAllowed(result);
      }
    });
    return () => {
      active = false;
    };
  }, [codigo, isSuperAdmin]);

  return allowed;
}

export function usePermissions(codigos: ReadonlyArray<string | null | undefined>): Record<string, boolean> {
  const { isSuperAdmin } = useAuth();
  const key = codigos.join('|');
  const [result, setResult] = useState<Record<string, boolean>>({});

  const refresh = useCallback(() => {
    const pending = codigos.filter((c): c is string => !!c);
    if (pending.length === 0) {
      setResult({});
      return;
    }
    if (isSuperAdmin) {
      setResult(Object.fromEntries(pending.map((c) => [c, true])));
      return;
    }
    let active = true;
    Promise.all(
      pending.map(async (c) => [c, await hasPermissionRpc(c)] as [string, boolean]),
    ).then((entries) => {
      if (active) {
        setResult(Object.fromEntries(entries));
      }
    });
    return () => {
      active = false;
    };
  }, [key, isSuperAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => result, [result, key]); // eslint-disable-line react-hooks/exhaustive-deps
}
