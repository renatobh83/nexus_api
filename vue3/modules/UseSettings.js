/**
 * @file UseSettings.js
 * @description Composable para gerenciamento de usuários.
 */
function UseSettings() {
    const { ref, computed, onMounted } = Vue
    const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

    function buildDefaultSchedule() {
        return DAY_LABELS.map((label, i) => ({
            dayOfWeek: i,
            label,
            enabled: i >= 1 && i <= 5, // Seg-Sex por padrão
            startTime: '08:00',
            endTime: '18:00',
        }))
    }

    const NATIONAL_HOLIDAYS_2025 = [
        { date: '2026-01-01', name: "Confraternização Universal" },
        { date: '2026-04-03', name: "Sexta-feira Santa" },
        { date: '2026-04-21', name: "Tiradentes" },
        { date: '2026-05-01', name: "Dia do Trabalho" },
        { date: '2026-06-11', name: "Corpus Christi" },
        { date: '2026-09-07', name: "Independência do Brasil" },
        { date: '2026-10-12', name: "Nossa Sra. Aparecida" },
        { date: '2026-11-02', name: "Finados" },
        { date: '2026-11-15', name: "Proclamação da República" },
        { date: '2026-12-25', name: "Natal" },
    ]
    const tab = ref('hours')
    const saving = ref(false)
    const selectedQueueId = ref('')
    const timezone = ref('America/Sao_Paulo')
    const schedule = ref(buildDefaultSchedule())
    const holidays = ref([])
    const queues = ref([])
    const toasts = ref([])
    const newHoliday = ref({ date: '', name: '' })
    const copyFromDay = ref('')
    const nationalHolidays = ref(NATIONAL_HOLIDAYS_2025)

    // ── Computed ──────────────────────────────────────────────────
    const activeDaysCount = computed(() => schedule.value.filter(d => d.enabled).length)
    const weekendCount = computed(() =>
        schedule.value.filter(d => d.enabled && (d.dayOfWeek === 0 || d.dayOfWeek === 6)).length
    )
    const avgHoursPerDay = computed(() => {
        const active = schedule.value.filter(d => d.enabled)
        if (!active.length) return '0'
        const total = active.reduce((sum, d) => sum + parseHours(d.startTime, d.endTime), 0)
        return (total / active.length).toFixed(1)
    })
    const sortedHolidays = computed(() =>
        [...holidays.value].sort((a, b) => a.date.localeCompare(b.date))
    )

    // ── Helpers ───────────────────────────────────────────────────
    function parseHours(start, end) {
        const [sh, sm] = start.split(':').map(Number)
        const [eh, em] = end.split(':').map(Number)
        return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
    }
    function calcHours(start, end) {
        const h = parseHours(start, end)
        return h > 0 ? `${h.toFixed(0)}h` : '!'
    }
    function formatDate(dateStr) {
        const [y, m, d] = dateStr.split('-')
        return `${d}/${m}/${y}`
    }

    function toast(message, type = 'success') {
        const id = Date.now()
        toasts.value.push({ id, message, type })
        setTimeout(() => {
            toasts.value = toasts.value.filter(t => t.id !== id)
        }, 3500)
    }

    // ── API calls ─────────────────────────────────────────────────
    async function apiFetch(path, options = {}) {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
    }

    async function loadQueues() {
        try {
            queues.value = await apiFetch('/queues')
        } catch {
            // Demo: queues de exemplo se API não disponível
            queues.value = [
                { id: '1', name: 'Suporte Técnico', hasHuman: true },
                { id: '2', name: 'FAQ Bot', hasHuman: false },
            ]
        }
    }

    async function loadHours() {
        try {
            const qp = selectedQueueId.value ? `?queueId=${selectedQueueId.value}` : ''
            const data = await apiFetch(`/service-hours${qp}`)

            const base = buildDefaultSchedule()
            data.forEach(item => {
                const day = base.find(d => d.dayOfWeek === item.dayOfWeek)
                if (day) {
                    day.enabled = item.enabled
                    day.startTime = item.startTime
                    day.endTime = item.endTime
                    if (item.timezone) timezone.value = item.timezone
                }
            })
            schedule.value = base
        } catch {
            // Mantém padrão se API offline
            schedule.value = buildDefaultSchedule()
        }
    }

    async function saveHours() {
        saving.value = true
        try {
            const payload = {
                queueId: selectedQueueId.value || null,
                timezone: timezone.value,
                days: schedule.value.map(d => ({
                    dayOfWeek: d.dayOfWeek,
                    enabled: d.enabled,
                    startTime: d.startTime,
                    endTime: d.endTime,
                }))
            }
            await apiFetch('/service-hours', {
                method: 'POST',
                body: JSON.stringify(payload),
            })
            toast('Horários salvos com sucesso!')
        } catch {
            toast('Erro ao salvar. Verifique a API.', 'error')
        } finally {
            saving.value = false
        }
    }

    async function loadHolidays() {
        try {
            holidays.value = await apiFetch('/service-hours/holidays')
        } catch {
            holidays.value = []
        }
    }

    async function saveHolidays() {
        saving.value = true
        try {
            await apiFetch('/service-hours/holidays', {
                method: 'POST',
                body: JSON.stringify({ holidays: holidays.value }),
            })
            toast('Feriados salvos com sucesso!')
        } catch {
            toast('Erro ao salvar feriados.', 'error')
        } finally {
            saving.value = false
        }
    }

    // ── Actions ───────────────────────────────────────────────────
    function addHoliday() {
        if (!newHoliday.value.date || !newHoliday.value.name) return
        if (holidays.value.some(h => h.date === newHoliday.value.date)) {
            toast('Esta data já está cadastrada.', 'error')
            return
        }
        holidays.value.push({
            id: Date.now().toString(),
            date: newHoliday.value.date,
            name: newHoliday.value.name,
        })
        newHoliday.value = { date: '', name: '' }
    }

    function removeHoliday(id) {
        holidays.value = holidays.value.filter(h => h.id !== id)
    }

    function quickAdd(h) {
        if (holidays.value.some(x => x.date === h.date)) return
        holidays.value.push({ id: Date.now().toString(), ...h })
    }

    function applyToAll() {
        if (copyFromDay.value === '') return
        const src = schedule.value.find(d => d.dayOfWeek === Number(copyFromDay.value))
        if (!src) return
        schedule.value.forEach(d => {
            if (d.enabled && d.dayOfWeek !== src.dayOfWeek) {
                d.startTime = src.startTime
                d.endTime = src.endTime
            }
        })
        toast(`Horário de ${src.label} aplicado aos dias ativos.`)
        copyFromDay.value = ''
    }

    function resetToGlobal() {
        selectedQueueId.value = ''
        loadHours()
    }

    onMounted(async () => {
        await loadQueues()
        await loadHours()
        await loadHolidays()
    })

    return {
        tab, saving, selectedQueueId, timezone, schedule, holidays,
        queues, toasts, newHoliday, copyFromDay, nationalHolidays,
        activeDaysCount, weekendCount, avgHoursPerDay, sortedHolidays,
        calcHours, formatDate,
        loadHours, saveHours, saveHolidays,
        addHoliday, removeHoliday, quickAdd, applyToAll, resetToGlobal,
    }

}