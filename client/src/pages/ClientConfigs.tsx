import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchClientConfigs, createClientConfig, updateClientConfig } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ClientConfigDoc = {
  _id: string;
  client_id: string;
  domains: string[];
  is_default?: boolean;
  client_config?: Record<string, unknown>;
};

type BrandingConfig = {
  clientName?: string;
  bubbleText?: string;
  headerLogoUrl?: string;
  headerLogoAlt?: string;
  sidebarTitle?: string;
  fabIconUrl?: string;
  fabThumbIconUrl?: string;
  poweredByLogoUrl?: string;
  poweredByLogoAlt?: string;
  poweredByLink?: string;
  recommendationEmailSubject?: string;
  productPageBaseUrl?: string;
};

type ThemeConfig = {
  primary?: string;
  onPrimary?: string;
  surface?: string;
  sidebarBackground?: string;
  sidebarBorder?: string;
  text?: string;
  menuBackground?: string;
  surfaceAlt?: string;
  accent?: string;
  outline?: string;
  mutedText?: string;
  border?: string;
  subtleText?: string;
  link?: string;
  darkSurface?: string;
  darkText?: string;
  cardImagePlaceholder?: string;
  closeButtonBackground?: string;
  menuItemBorderColor?: string;
  menuItemHoverColor?: string;
};

type ServicesConfig = {
  sendRecommendationEmailApiUrl?: string;
  generateRecommendationApiUrl?: string;
};

type ClientConfigContent = {
  branding?: BrandingConfig;
  theme?: Record<string, unknown>;
  product?: Record<string, unknown>;
  services?: ServicesConfig;
  filters_disabled?: boolean;
};

const brandingFields: {
  key: keyof BrandingConfig;
  id: string;
  label: string;
  placeholder: string;
}[] = [
  { key: "clientName", id: "brandingClientName", label: "Client name", placeholder: "Engineered Floors" },
  { key: "bubbleText", id: "brandingBubbleText", label: "Bubble text", placeholder: "Find your perfect match" },
  { key: "headerLogoUrl", id: "brandingHeaderLogoUrl", label: "Header logo URL", placeholder: "https://example.com/logo.png" },
  { key: "headerLogoAlt", id: "brandingHeaderLogoAlt", label: "Header logo alt text", placeholder: "Company logo" },
  { key: "sidebarTitle", id: "brandingSidebarTitle", label: "Sidebar title", placeholder: "Color Match" },
  { key: "fabIconUrl", id: "brandingFabIconUrl", label: "FAB icon URL", placeholder: "search icon.png" },
  { key: "fabThumbIconUrl", id: "brandingFabThumbIconUrl", label: "FAB thumb icon URL", placeholder: "search icon.png" },
  { key: "poweredByLogoUrl", id: "brandingPoweredByLogoUrl", label: "Powered by logo URL", placeholder: "https://example.com/powered-by.png" },
  { key: "poweredByLogoAlt", id: "brandingPoweredByLogoAlt", label: "Powered by logo alt text", placeholder: "Powered by EF" },
  { key: "poweredByLink", id: "brandingPoweredByLink", label: "Powered by link", placeholder: "https://example.com" },
  {
    key: "recommendationEmailSubject",
    id: "brandingRecommendationEmailSubject",
    label: "Recommendation email subject",
    placeholder: "Your color match recommendations",
  },
  { key: "productPageBaseUrl", id: "brandingProductPageBaseUrl", label: "Product page base URL", placeholder: "https://example.com/products" },
];

const serviceFields: {
  key: keyof ServicesConfig;
  id: string;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "sendRecommendationEmailApiUrl",
    id: "sendRecommendationEmailApiUrl",
    label: "Send recommendation email API URL",
    placeholder: "https://api.example.com/send-email",
  },
  {
    key: "generateRecommendationApiUrl",
    id: "generateRecommendationApiUrl",
    label: "Generate recommendation API URL",
    placeholder: "https://api.example.com/generate",
  },
];

export default function ClientConfigs() {
  const queryClient = useQueryClient();
  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ["client-configs"],
    queryFn: fetchClientConfigs,
  });

  const configs: ClientConfigDoc[] = data?.data || [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [domainsText, setDomainsText] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig>({});
  const [theme, setTheme] = useState<ThemeConfig>({});
  const [productText, setProductText] = useState("{}");
  const [services, setServices] = useState<ServicesConfig>({});
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isEditing = !!editingId;

  const handleLoad = (doc: ClientConfigDoc) => {
    const config = (doc.client_config || {}) as ClientConfigContent;

    setEditingId(doc._id);
    setClientId(doc.client_id || "");
    setDomainsText((doc.domains || []).join(", "));
    setIsDefault(!!doc.is_default);
    setBranding((config.branding || {}) as BrandingConfig);
    const themeConfig = (config.theme || {}) as Record<string, unknown>;
    setTheme({
      primary: themeConfig.primary as string,
      onPrimary: themeConfig.onPrimary as string,
      surface: themeConfig.surface as string,
      sidebarBackground: themeConfig.sidebarBackground as string,
      sidebarBorder: themeConfig.sidebarBorder as string,
      text: themeConfig.text as string,
      menuBackground: themeConfig.menuBackground as string,
      surfaceAlt: themeConfig.surfaceAlt as string,
      accent: themeConfig.accent as string,
      outline: themeConfig.outline as string,
      mutedText: themeConfig.mutedText as string,
      border: themeConfig.border as string,
      subtleText: themeConfig.subtleText as string,
      link: themeConfig.link as string,
      darkSurface: themeConfig.darkSurface as string,
      darkText: themeConfig.darkText as string,
      cardImagePlaceholder: themeConfig.cardImagePlaceholder as string,
      closeButtonBackground: themeConfig.closeButtonBackground as string,
      menuItemBorderColor: themeConfig.menuItemBorderColor as string,
      menuItemHoverColor: themeConfig.menuItemHoverColor as string,
    });
    setProductText(JSON.stringify(config.product || {}, null, 2));
    setServices((config.services || {}) as ServicesConfig);
    setFiltersDisabled(!!config.filters_disabled);
    setError(null);
    setIsModalOpen(true);
  };

  const handleCopy = (doc: ClientConfigDoc) => {
    const config = (doc.client_config || {}) as ClientConfigContent;
    const themeConfig = (config.theme || {}) as Record<string, unknown>;
    setEditingId(null);
    setClientId(doc.client_id ? `${doc.client_id}-copy` : "");
    setDomainsText((doc.domains || []).join(", "));
    setIsDefault(false);
    setBranding((config.branding || {}) as BrandingConfig);
    setTheme({
      primary: themeConfig.primary as string,
      onPrimary: themeConfig.onPrimary as string,
      surface: themeConfig.surface as string,
      sidebarBackground: themeConfig.sidebarBackground as string,
      sidebarBorder: themeConfig.sidebarBorder as string,
      text: themeConfig.text as string,
      menuBackground: themeConfig.menuBackground as string,
      surfaceAlt: themeConfig.surfaceAlt as string,
      accent: themeConfig.accent as string,
      outline: themeConfig.outline as string,
      mutedText: themeConfig.mutedText as string,
      border: themeConfig.border as string,
      subtleText: themeConfig.subtleText as string,
      link: themeConfig.link as string,
      darkSurface: themeConfig.darkSurface as string,
      darkText: themeConfig.darkText as string,
      cardImagePlaceholder: themeConfig.cardImagePlaceholder as string,
      closeButtonBackground: themeConfig.closeButtonBackground as string,
      menuItemBorderColor: themeConfig.menuItemBorderColor as string,
      menuItemHoverColor: themeConfig.menuItemHoverColor as string,
    });
    setProductText(JSON.stringify(config.product || {}, null, 2));
    setServices((config.services || {}) as ServicesConfig);
    setFiltersDisabled(!!config.filters_disabled);
    setError(null);
    setIsModalOpen(true);
  };

  const normalizedDomains = useMemo(() => {
    return domainsText
      .split(/[\n,]+/g)
      .map((d) => d.trim())
      .filter(Boolean);
  }, [domainsText]);

  const getColorValue = (value?: string) => {
    if (value && value.trim().startsWith("#")) {
      return value.trim();
    }
    return "#000000";
  };

  const colorFields: { key: keyof ThemeConfig; label: string; placeholder: string }[] = [
    { key: "primary", label: "Primary", placeholder: "#4c4b43" },
    { key: "onPrimary", label: "On Primary", placeholder: "#eae7dd" },
    { key: "surface", label: "Surface", placeholder: "#eae7dd" },
    { key: "surfaceAlt", label: "Surface Alt", placeholder: "#f9f6f2" },
    { key: "sidebarBackground", label: "Sidebar Background", placeholder: "#f9f6f2" },
    { key: "sidebarBorder", label: "Sidebar Border", placeholder: "#ccc" },
    { key: "menuBackground", label: "Menu Background", placeholder: "#3a3a3a" },
    { key: "text", label: "Text", placeholder: "#4c4b43" },
    { key: "mutedText", label: "Muted Text", placeholder: "#6b675b" },
    { key: "subtleText", label: "Subtle Text", placeholder: "#777777" },
    { key: "border", label: "Border", placeholder: "#cccccc" },
    { key: "outline", label: "Outline", placeholder: "#484741" },
    { key: "accent", label: "Accent", placeholder: "#545454" },
    { key: "link", label: "Link", placeholder: "#1d73f2" },
    { key: "darkSurface", label: "Dark Surface", placeholder: "#333333" },
    { key: "darkText", label: "Dark Text", placeholder: "#eae7dd" },
    { key: "cardImagePlaceholder", label: "Card Image Placeholder", placeholder: "#222222" },
  ];

  const saveMutation = useMutation({
    mutationFn: async () => {
      try {
        const parsedProduct = productText ? JSON.parse(productText) : {};

        if (!clientId.trim()) {
          throw new Error("client_id is required");
        }

        const payload = {
          client_id: clientId.trim(),
          domains: normalizedDomains,
          is_default: isDefault,
          client_config: {
            branding: branding || {},
            theme: theme || {},
            product: parsedProduct || {},
            services: services || {},
            filters_disabled: filtersDisabled,
          },
        };

        if (isEditing) {
          return updateClientConfig(editingId as string, payload);
        }

        return createClientConfig(payload);
      } catch (parseError) {
        throw new Error("Product config must be valid JSON");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-configs"] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to save client config");
    },
  });

  const formContent = (
    <div className="space-y-4">
      {!isEditing && (
        <div className="text-sm text-muted-foreground">
          Use Copy from the list to create a new client.
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="clientId">Client ID</Label>
        <Input
          id="clientId"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          placeholder="engineeredfloors"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="domains">Domains (comma or new line)</Label>
        <Textarea
          id="domains"
          value={domainsText}
          onChange={(event) => setDomainsText(event.target.value)}
          placeholder="engineeredfloors.com, www.engineeredfloors.com"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="isDefault">Set as default</Label>
        <div>
          <input
            id="isDefault"
            type="checkbox"
            className="mr-2"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
          />
          <span className="text-sm text-muted-foreground">Only one client can be default</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filtersDisabled">Filters disabled</Label>
        <div>
          <input
            id="filtersDisabled"
            type="checkbox"
            className="mr-2"
            checked={filtersDisabled}
            onChange={(event) => setFiltersDisabled(event.target.checked)}
          />
          <span className="text-sm text-muted-foreground">Hide product filters in the widget (default: off)</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Branding</Label>
        <div className="grid gap-3">
          {brandingFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.id} className="text-xs text-muted-foreground">
                {field.label}
              </Label>
              <Input
                id={field.id}
                value={branding[field.key] || ""}
                onChange={(event) => setBranding({ ...branding, [field.key]: event.target.value })}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Theme Colors</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          {colorFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="h-10 w-12 p-1"
                  value={getColorValue(theme[field.key])}
                  onChange={(event) => setTheme({ ...theme, [field.key]: event.target.value })}
                />
                <Input
                  value={theme[field.key] || ""}
                  onChange={(event) => setTheme({ ...theme, [field.key]: event.target.value })}
                  placeholder={field.placeholder}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Theme Effects</Label>
        <div className="text-sm text-muted-foreground">
          Theme effects are shared across all clients and are not edited here.
        </div>
      </div>

      <div className="space-y-2">
        <Label>Services</Label>
        <div className="grid gap-3">
          {serviceFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.id} className="text-xs text-muted-foreground">
                {field.label}
              </Label>
              <Input
                id={field.id}
                value={services[field.key] || ""}
                onChange={(event) => setServices({ ...services, [field.key]: event.target.value })}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="productJson">Product Config (JSON)</Label>
        <Textarea
          id="productJson"
          value={productText}
          onChange={(event) => setProductText(event.target.value)}
          placeholder='{"apiRequirements": "...", "apiMapping": {}}'
          rows={12}
        />
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Client Configs</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Manage client configs, copy existing, and edit branding/theme settings.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground">Loading client configs...</div>
            ) : queryError ? (
              <div className="text-sm text-destructive">
                Failed to load client configs. Please check your login and API access.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Domains</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>{item.client_id}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(item.domains || []).join(", ")}
                      </TableCell>
                      <TableCell>{item.is_default ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleLoad(item)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleCopy(item)}>
                          Copy
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="h-[95vh] w-[95vw] max-w-none overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Client" : "Copy Client"}</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
