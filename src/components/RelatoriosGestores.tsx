import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CheckSquare, FileText, Image, Mic, Paperclip, Send, Video } from 'lucide-react';
import { useStock } from '../context/StockContext';
import { RelatorioAnexo, RelatorioAnexoTipo } from '../types';

const MAX_FILE_BYTES = 900 * 1024;
const MAX_TOTAL_BYTES = 1_200 * 1024;

const dateKey = (value: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const formatDateTime = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza'
}).format(new Date(value));

const formatBytes = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

const getAttachmentType = (file: File): RelatorioAnexoTipo | null => {
  if (file.type.startsWith('image/')) return 'imagem';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return null;
};

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Arquivo inválido.'));
  reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
  reader.readAsDataURL(file);
});

const AttachmentIcon: React.FC<{ type: RelatorioAnexoTipo; className?: string }> = ({ type, className }) => {
  if (type === 'audio') return <Mic className={className} />;
  if (type === 'video') return <Video className={className} />;
  return <Image className={className} />;
};

export const RelatoriosGestores: React.FC = () => {
  const {
    user, currentUnit, relatorios, relatoriosPendentes, addRelatorio, marcarRelatorioVerificado
  } = useStock();
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState<RelatorioAnexo[]>([]);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [status, setStatus] = useState<'pendentes' | 'todos'>('pendentes');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const pendingIds = useMemo(() => new Set(relatoriosPendentes.map(report => report.id)), [relatoriosPendentes]);
  const filteredReports = useMemo(() => relatorios
    .filter(report => status === 'todos' || pendingIds.has(report.id))
    .filter(report => !inicio || dateKey(report.criadoEm) >= inicio)
    .filter(report => !fim || dateKey(report.criadoEm) <= fim)
    .sort((left, right) => right.criadoEm.localeCompare(left.criadoEm)),
    [fim, inicio, pendingIds, relatorios, status]);

  const clearFeedbackLater = () => window.setTimeout(() => setFeedback(null), 4500);

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    event.target.value = '';
    if (!files.length) return;

    let totalBytes = anexos.reduce((sum, attachment) => sum + attachment.tamanho, 0);
    const accepted: RelatorioAnexo[] = [];
    for (const file of files) {
      const tipo = getAttachmentType(file);
      if (!tipo) {
        setFeedback({ type: 'error', text: `${file.name} não é uma imagem, áudio ou vídeo aceito.` });
        clearFeedbackLater();
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFeedback({ type: 'error', text: `${file.name} ultrapassa 900 KB. Para vídeos, envie um clipe curto.` });
        clearFeedbackLater();
        continue;
      }
      if (anexos.length + accepted.length >= 8 || totalBytes + file.size > MAX_TOTAL_BYTES) {
        setFeedback({ type: 'error', text: 'O relatório pode ter até 8 anexos e 1,2 MB no total.' });
        clearFeedbackLater();
        break;
      }

      try {
        accepted.push({
          id: `attachment-${Date.now()}-${accepted.length}`,
          nome: file.name,
          tipo,
          mimeType: file.type,
          tamanho: file.size,
          dataUrl: await readFileAsDataUrl(file)
        });
        totalBytes += file.size;
      } catch {
        setFeedback({ type: 'error', text: `Não foi possível carregar ${file.name}.` });
        clearFeedbackLater();
      }
    }
    if (accepted.length) setAnexos(previous => [...previous, ...accepted]);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSending) return;
    setIsSending(true);
    const result = addRelatorio({ titulo, texto, anexos });
    setIsSending(false);
    if (!result.success) {
      setFeedback({ type: 'error', text: result.error || 'Não foi possível enviar o relatório.' });
      clearFeedbackLater();
      return;
    }
    setTitulo('');
    setTexto('');
    setAnexos([]);
    setFeedback({ type: 'success', text: 'Relatório enviado para os gestores da unidade.' });
    clearFeedbackLater();
  };

  const handleVerify = (id: string) => {
    const result = marcarRelatorioVerificado(id);
    if (!result.success) {
      setFeedback({ type: 'error', text: result.error || 'Não foi possível marcar o relatório.' });
      clearFeedbackLater();
      return;
    }
    setFeedback({ type: 'success', text: 'Relatório marcado como verificado para este gestor.' });
    clearFeedbackLater();
  };

  if (user.cargo === 'Colaborador') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Esta área é exclusiva para gestores.
      </div>
    );
  }

  return (
    <div className="space-y-6" id="relatorios-gestores-view">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-navy">Comunicação gerencial</span>
          <h2 className="mt-1 text-xl font-bold text-slate-800">Relatórios dos Gestores</h2>
          <p className="mt-1 text-xs text-slate-500">Envie ocorrências escritas, áudios, fotos e vídeos para a equipe da {currentUnit}.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          <CheckSquare className="h-4 w-4" />
          {relatoriosPendentes.length} pendente{relatoriosPendentes.length === 1 ? '' : 's'} para você
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" id="gestor-report-form">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-brand-navy/5 p-2.5 text-brand-navy"><Send className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-800">Enviar novo relatório</h3>
            <p className="text-xs text-slate-500">Os gestores da mesma unidade receberão uma pendência até verificarem a mensagem.</p>
          </div>
        </div>
        <div className="grid gap-4">
          <div>
            <label htmlFor="report-title" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Título *</label>
            <input id="report-title" value={titulo} onChange={event => setTitulo(event.target.value)} required maxLength={200} placeholder="Ex.: Ocorrência no turno da noite" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10" />
          </div>
          <div>
            <label htmlFor="report-text" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Relato escrito *</label>
            <textarea id="report-text" value={texto} onChange={event => setTexto(event.target.value)} required maxLength={20000} rows={5} placeholder="Descreva o que aconteceu, o local e os próximos passos..." className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10" />
          </div>
          <div>
            <label htmlFor="report-files" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Anexos</label>
            <label htmlFor="report-files" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 transition hover:border-brand-navy hover:bg-brand-navy/5">
              <Paperclip className="h-4 w-4 text-brand-navy" />
              <span>Adicionar fotos, áudios ou vídeos curtos</span>
              <span className="ml-auto text-[10px] font-normal text-slate-400">até 8 arquivos · 1,2 MB</span>
            </label>
            <input id="report-files" type="file" multiple accept="image/*,audio/*,video/*" onChange={handleFiles} className="sr-only" />
            {anexos.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {anexos.map(attachment => (
                  <div key={attachment.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <AttachmentIcon type={attachment.tipo} className="h-4 w-4 shrink-0 text-brand-navy" />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{attachment.nome}</span>
                    <span className="text-[10px] text-slate-400">{formatBytes(attachment.tamanho)}</span>
                    <button type="button" onClick={() => setAnexos(previous => previous.filter(item => item.id !== attachment.id))} className="text-rose-500 hover:text-rose-700" aria-label={`Remover ${attachment.nome}`}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={isSending} className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
            <Send className="h-4 w-4" />
            {isSending ? 'Enviando...' : 'Enviar relatório'}
          </button>
        </div>
      </form>

      <section className="space-y-4" aria-labelledby="report-history-title">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h3 id="report-history-title" className="font-bold text-slate-800">Caixa de relatórios</h3>
              <p className="mt-1 text-xs text-slate-500">A marcação de verificado é individual e não remove a mensagem dos outros gestores.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
              <div>
                <label htmlFor="report-start" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">De</label>
                <input id="report-start" type="date" value={inicio} onChange={event => setInicio(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-600" />
              </div>
              <div>
                <label htmlFor="report-end" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Até</label>
                <input id="report-end" type="date" value={fim} onChange={event => setFim(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-600" />
              </div>
              <select value={status} onChange={event => setStatus(event.target.value as 'pendentes' | 'todos')} aria-label="Filtrar status dos relatórios" className="col-span-2 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 sm:col-span-1">
                <option value="pendentes">Pendentes para mim</option>
                <option value="todos">Todos do histórico</option>
              </select>
            </div>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <h4 className="mt-3 text-sm font-bold text-slate-700">{status === 'pendentes' ? 'Tudo verificado por você' : 'Nenhum relatório encontrado'}</h4>
            <p className="mt-1 text-xs text-slate-500">Ajuste o período ou consulte o histórico completo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map(report => {
              const isPending = pendingIds.has(report.id);
              const isOwnReport = report.autorId === (user.id || user.email);
              return (
                <article key={report.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${isPending ? 'border-amber-200' : 'border-slate-200'}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">{report.titulo}</h4>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${isPending ? 'bg-amber-100 text-amber-800' : isOwnReport ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isPending ? 'Pendente' : isOwnReport ? 'Enviado por você' : 'Verificado por você'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">Por {report.autorNome} · {formatDateTime(report.criadoEm)}</p>
                    </div>
                    {isPending && (
                      <button type="button" onClick={() => handleVerify(report.id)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100">
                        <CheckCircle2 className="h-4 w-4" />
                        Marcar como verificado
                      </button>
                    )}
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.texto}</p>
                  {report.anexos.length > 0 && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {report.anexos.map(attachment => (
                        <div key={attachment.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {attachment.tipo === 'imagem' && <img src={attachment.dataUrl} alt={attachment.nome} className="max-h-64 w-full object-contain" />}
                          {attachment.tipo === 'audio' && <div className="p-3"><audio controls className="w-full" src={attachment.dataUrl}>Seu navegador não suporta áudio.</audio></div>}
                          {attachment.tipo === 'video' && <video controls className="max-h-64 w-full bg-black" src={attachment.dataUrl}>Seu navegador não suporta vídeo.</video>}
                          <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2 text-[11px] text-slate-600">
                            <AttachmentIcon type={attachment.tipo} className="h-3.5 w-3.5 text-brand-navy" />
                            <span className="truncate">{attachment.nome}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
