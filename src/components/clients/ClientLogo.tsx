import { useState, useCallback } from 'react';
import { useClients, useUpdateClient } from '@/hooks/useOutreach';

const INITIALS_COLORS = [
  '#1F4E78', '#4472C4', '#70AD47', '#FFC000',
  '#7030A0', '#ED7D31', '#44546A', '#C55A11',
  '#5B9BD5', '#BF8F00',
];

function getInitialsColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const LOGO_PROVIDERS = [
  (domain: string, size: number) => `https://img.logo.dev/${domain}?token=pk_anonymous&size=${size}`,
  (domain: string) => `https://logo.clearbit.com/${domain}`,
  (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
];

interface ClientLogoProps {
  clientId: string;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

export function ClientLogo({ clientId, size = 32, className = '', showLabel = false }: ClientLogoProps) {
  const { data: clients = [] } = useClients();
  const updateClient = useUpdateClient();
  const [providerIndex, setProviderIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  const client = clients.find((c) => c.id === clientId);

  const handleError = useCallback(() => {
    const nextIndex = providerIndex + 1;
    if (nextIndex < LOGO_PROVIDERS.length) {
      setProviderIndex(nextIndex);
    } else {
      setAllFailed(true);
    }
  }, [providerIndex]);

  const handleLoad = useCallback((url: string) => {
    if (client && !client.logoUrl) {
      updateClient.mutate({ id: clientId, data: { logoUrl: url } });
    }
  }, [client, clientId, updateClient]);

  if (!client) return null;

  const initials = getInitials(client.name);
  const color = getInitialsColor(client.name);
  const fetchSize = showLabel ? 120 : size * 2;

  const renderLogo = () => {
    // Try cached logo URL first
    if (client.logoUrl && !allFailed) {
      return (
        <img
          src={client.logoUrl}
          alt={client.name}
          className={`rounded-md object-contain ${className}`}
          style={{ width: size, height: size }}
          onError={() => {
            setAllFailed(true);
          }}
        />
      );
    }

    // Try providers in cascade if we have a domain
    if (client.clientDomain && !allFailed && !client.logoUrl) {
      const provider = LOGO_PROVIDERS[providerIndex];
      const logoUrl = provider(client.clientDomain, fetchSize);
      return (
        <img
          src={logoUrl}
          alt={client.name}
          className={`rounded-md object-contain ${className}`}
          style={{ width: size, height: size }}
          onLoad={() => handleLoad(logoUrl)}
          onError={handleError}
        />
      );
    }

    // Initials fallback
    return (
      <div
        className={`flex items-center justify-center rounded-md font-semibold text-white ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          fontSize: size * 0.38,
        }}
      >
        {initials}
      </div>
    );
  };

  if (!showLabel) return renderLogo();

  return (
    <div className="flex flex-col items-center gap-1">
      {renderLogo()}
      <span
        className="text-[10px] font-medium text-wpnt-body leading-tight text-center line-clamp-2"
        style={{ maxWidth: size * 2.5, wordBreak: 'break-word' }}
      >
        {client.name}
      </span>
    </div>
  );
}
