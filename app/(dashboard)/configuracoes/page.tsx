"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, CreditCard, Eye, EyeOff, FileText } from "lucide-react"

type SettingsForm = {
  storeName: string
  logoUrl?: string
  address?: string
  phone?: string
  serviceFee: number
  kdsSlaMinutes: number
  printFooter?: string
  openHours?: string
  stoneEnabled: boolean
  stoneAccountId?: string
  stoneClientId?: string
  stoneClientSecret?: string
  stoneTerminalSerial?: string
  fiscalEnabled: boolean
  fiscalCnpj?: string
  fiscalIE?: string
  fiscalCRT?: string
  fiscalSerie?: number
  fiscalAmbiente?: string
  fiscalFocusToken?: string
}

export default function ConfiguracoesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [showSecret, setShowSecret] = useState(false)
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<SettingsForm>()
  const stoneEnabled = watch("stoneEnabled")
  const fiscalEnabled = watch("fiscalEnabled")

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        reset({
          storeName: data.storeName ?? "",
          logoUrl: data.logoUrl ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
          serviceFee: Number(data.serviceFee ?? 0),
          kdsSlaMinutes: Number(data.kdsSlaMinutes ?? 15),
          printFooter: data.printFooter ?? "",
          openHours: data.openHours ?? "",
          stoneEnabled: data.stoneEnabled ?? false,
          stoneAccountId: data.stoneAccountId ?? "",
          stoneClientId: data.stoneClientId ?? "",
          stoneClientSecret: data.stoneClientSecret ?? "",
          stoneTerminalSerial: data.stoneTerminalSerial ?? "",
          fiscalEnabled: data.fiscalEnabled ?? false,
          fiscalCnpj: data.fiscalCnpj ?? "",
          fiscalIE: data.fiscalIE ?? "",
          fiscalCRT: data.fiscalCRT ?? "1",
          fiscalSerie: data.fiscalSerie ?? 1,
          fiscalAmbiente: data.fiscalAmbiente ?? "homologacao",
          fiscalFocusToken: data.fiscalFocusToken ?? "",
        })
        setLoading(false)
      })
  }, [reset])

  const onSubmit = async (data: SettingsForm) => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const detail =
        typeof err?.error === "string" ? err.error : "Erro ao salvar configurações"
      toast({ variant: "destructive", title: "Erro ao salvar configurações", description: detail })
      return
    }
    toast({ title: "Configurações salvas" })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Dados da loja e impressão"
      />

      <Card>
        <CardHeader>
          <CardTitle>Loja</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
            <div>
              <Label htmlFor="storeName">Nome da loja</Label>
              <Input id="storeName" {...register("storeName", { required: true })} />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div>
              <Label htmlFor="openHours">Horário de funcionamento</Label>
              <Input id="openHours" {...register("openHours")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serviceFee">Taxa de serviço (%)</Label>
                <Input id="serviceFee" type="number" step="0.01" {...register("serviceFee", { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="kdsSlaMinutes">SLA cozinha (minutos)</Label>
                <Input id="kdsSlaMinutes" type="number" {...register("kdsSlaMinutes", { valueAsNumber: true })} />
              </div>
            </div>
            <div>
              <Label htmlFor="printFooter">Rodapé do cupom</Label>
              <Input id="printFooter" {...register("printFooter")} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Integração Stone (Maquininha)
          </CardTitle>
          <CardDescription>
            Configure as credenciais Stone para enviar pagamentos à maquininha física.
            O Client Secret é armazenado de forma segura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
            <div className="flex items-center gap-3">
              <input
                id="stoneEnabled"
                type="checkbox"
                {...register("stoneEnabled")}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="stoneEnabled" className="cursor-pointer">
                Habilitar integração Stone
              </Label>
            </div>

            {stoneEnabled && (
              <>
                <div>
                  <Label htmlFor="stoneAccountId">Account ID (Stone)</Label>
                  <Input
                    id="stoneAccountId"
                    placeholder="ex: acc_xxxxxxxxxxxxxxxx"
                    {...register("stoneAccountId")}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Encontrado no painel Stone em Conta &gt; Dados da conta
                  </p>
                </div>
                <div>
                  <Label htmlFor="stoneClientId">Client ID (OAuth2)</Label>
                  <Input
                    id="stoneClientId"
                    placeholder="ex: pdv-galetos"
                    {...register("stoneClientId")}
                  />
                </div>
                <div>
                  <Label htmlFor="stoneClientSecret">Client Secret (OAuth2)</Label>
                  <div className="relative">
                    <Input
                      id="stoneClientSecret"
                      type={showSecret ? "text" : "password"}
                      placeholder="••••••••••••••••"
                      {...register("stoneClientSecret")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="stoneTerminalSerial">Nº de Série da Maquininha</Label>
                  <Input
                    id="stoneTerminalSerial"
                    placeholder="ex: STN-123456789"
                    {...register("stoneTerminalSerial")}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Encontrado na etiqueta atrás da maquininha ou no app Stone
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium mb-1">Configuração do Webhook</p>
                  <p>
                    No painel Stone, registre o webhook apontando para:{" "}
                    <code className="bg-amber-100 px-1 rounded text-xs">
                      https://seu-dominio.com/api/stone/webhook
                    </code>
                  </p>
                  <p className="mt-1">
                    Adicione <code className="bg-amber-100 px-1 rounded text-xs">STONE_WEBHOOK_SECRET</code> no{" "}
                    <code className="bg-amber-100 px-1 rounded text-xs">.env.local</code>.
                  </p>
                </div>
              </>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar configurações Stone
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            NFC-e (Focus NFe)
          </CardTitle>
          <CardDescription>
            Emissão automática de NFC-e via Focus NFe. Crie sua conta em{" "}
            <a href="https://focusnfe.com.br" target="_blank" rel="noreferrer" className="underline">
              focusnfe.com.br
            </a>{" "}
            e copie o token de acesso abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
            <div className="flex items-center gap-3">
              <input
                id="fiscalEnabled"
                type="checkbox"
                {...register("fiscalEnabled")}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="fiscalEnabled" className="cursor-pointer">
                Habilitar emissão de NFC-e
              </Label>
            </div>

            {fiscalEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fiscalCnpj">CNPJ do Emitente *</Label>
                    <Input id="fiscalCnpj" placeholder="00.000.000/0001-00" {...register("fiscalCnpj")} />
                  </div>
                  <div>
                    <Label htmlFor="fiscalIE">Inscrição Estadual</Label>
                    <Input id="fiscalIE" placeholder="ISENTO ou número" {...register("fiscalIE")} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fiscalCRT">CRT</Label>
                    <select
                      id="fiscalCRT"
                      {...register("fiscalCRT")}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="1">1 — Simples Nacional</option>
                      <option value="2">2 — Simples Excesso</option>
                      <option value="3">3 — Regime Normal</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="fiscalSerie">Série</Label>
                    <Input id="fiscalSerie" type="number" min={1} {...register("fiscalSerie", { valueAsNumber: true })} />
                  </div>
                  <div>
                    <Label htmlFor="fiscalAmbiente">Ambiente</Label>
                    <select
                      id="fiscalAmbiente"
                      {...register("fiscalAmbiente")}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="homologacao">Homologação (teste)</option>
                      <option value="producao">Produção</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="fiscalFocusToken">Token Focus NFe *</Label>
                  <Input
                    id="fiscalFocusToken"
                    type="password"
                    placeholder="Token da API Focus NFe"
                    {...register("fiscalFocusToken")}
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Encontrado em focusnfe.com.br → Configurações → Token de acesso
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">Pré-requisitos por produto</p>
                  <p>
                    Para emissão correta, cada produto deve ter{" "}
                    <strong>NCM</strong>, <strong>CFOP</strong>, <strong>CST</strong> e{" "}
                    <strong>Origem</strong> preenchidos no cadastro de produtos.
                  </p>
                </div>
              </>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar configurações NFC-e
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

