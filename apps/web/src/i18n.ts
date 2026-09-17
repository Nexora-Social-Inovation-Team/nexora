import i18n from "i18next";
import { initReactI18next } from "react-i18next";

/**
 * Single `tr` resource. Copy is verbatim from docs/DESIGN.md (and docs/PRIVACY.md
 * for the privacy table). UI is Turkish only — no English strings ship.
 *
 * Components read scalars through `t("...")` and lists straight off `tr`, which
 * keeps the arrays typed without i18next module augmentation.
 */
export const tr = {
  brand: "NEXORA",
  skipToContent: "İçeriğe geç",
  nav: {
    howItWorks: "Nasıl çalışır",
    privacy: "Gizlilik",
    faq: "SSS",
    login: "Giriş",
  },
  footer: {
    title: "KVKK",
    note: "NEXORA — Phase A demo. Ham bağlantı, mesaj veya arama kaydı toplanmaz.",
    links: [
      { label: "KVKK aydınlatma metni", to: "/privacy" },
      { label: "Veri politikası", to: "/privacy" },
      { label: "Sık sorulan sorular", to: "/faq" },
    ],
  },
  landing: {
    title: "Ölç → Anla → Koçla → Üret",
    sub: "13–18 yaş için yerli sosyal yapay zekâ. Yasaklamadan, yargılamadan.",
    trust: "Ham URL yok. Mesaj yok. Arama kaydı yok.",
    cta: "Nasıl çalışır?",
    ctaSecondary: "Veli paneli (demo)",
    cardsEyebrow: "ROLLER",
    cardsTitle: "Kim ne görür?",
    cards: [
      { title: "Genç", body: "Kısa skor, kısa görev, görünür üretim." },
      { title: "Veli", body: "Kategori eğilimleri ve birlikte hedef. Geçmiş dökümü yok." },
      { title: "Öğretmen", body: "Sınıf özeti dakikalar içinde." },
    ],
  },
  how: {
    title: "Nasıl çalışır?",
    sub: "Dört adım. Her adım özet düzeyinde çalışır.",
    steps: [
      { title: "1. Ölç", body: "Tarayıcı eklentisi yalnızca kategori dakikalarını özetler. Bağlantı gönderilmez." },
      { title: "2. Anla", body: "Kurallı skor ve üç sade neden. Skor bir not değil, aynadır." },
      { title: "3. Koçla", body: "Üç kısa öneri ve 5–30 dakikalık bir mikro-görev." },
      { title: "4. Üret", body: "Küçük bir üretim, tüketimi dengeler." },
    ],
    frame: "örnek haftalık rapor",
  },
  privacy: {
    title: "Gizlilik",
    sub: "Toplananlar yalnızca özet düzeyindedir.",
    tableCaption: "Toplananlar ve asla toplanmayanlar",
    columns: { data: "Veri", state: "Durum", example: "Örnek", who: "Kim görür?" },
    collectedLabel: "Toplanır",
    neverLabel: "Asla toplanmaz",
    nobody: "Kimse",
    dash: "—",
    collected: [
      { data: "Kategori dakika özetleri", example: "{ bilim: 40, eğlence: 120 }", who: "Genç; veli ve öğretmen toplu olarak" },
      { data: "Skor ve üç neden", example: "{ değer: 72, nedenler: 3 kısa cümle }", who: "Genç; veli; öğretmen" },
      { data: "Görev ve rozet ilerlemesi", example: "görev no, tamamlanma zamanı", who: "Genç; veli; öğretmen" },
      { data: "Veli onayı durumu", example: "onay bekliyor / aktif / geri çekildi", who: "Genç, veli, yönetici" },
      { data: "Demo kimliği", example: "görünen ad, rol", who: "Giriş yapan kullanıcı" },
    ],
    never: [
      "Ham bağlantılar veya tam alan adı ve yol",
      "Sayfa içeriği (HTML veya metin)",
      "Mesajlar (özel mesaj, yorum, açıklama)",
      "Arama sorguları",
      "Form alanları ve şifreler",
      "Akış ekran görüntüleri",
      "Hassas konum (GPS)",
      "Rehber ve kişi listesi",
    ],
    sections: [
      {
        title: "Veli onayı",
        body: "Genç hesabı, bir veli onaylayana kadar açılmaz. Onay gelene kadar özet, skor ve koç üretilmez.",
      },
      {
        title: "Geri çekme (30 gün)",
        body: "Veli onayı istediği an geri çekebilir. Geri çekildiğinde yeni işleme durur ve silme süreci 30 gün içinde tamamlanır.",
      },
      {
        title: "Tanı koymaz",
        body: "NEXORA ruh sağlığı tanısı koymaz ve kesin bir risk hükmü vermez. Zararlı içerik payı yüksekse dil, destek önerisi ve güvendiğin bir yetişkine yönlendirmedir.",
      },
    ],
  },
  faq: {
    title: "Sık sorulan sorular",
    items: [
      { q: "Şifrelerinizi istiyor musunuz?", a: "Hayır." },
      { q: "Ham içerik okunuyor mu?", a: "Hayır. Yalnızca izinli kategori dakikaları." },
      { q: "Kim neyi görür?", a: "Genç kendi özetini; veli/öğretmen toplu kategorileri. Tam bağlantı yok." },
      { q: "Ruh sağlığı tanısı koyuyor mu?", a: "Hayır. Risk dilinde destek önerisi vardır." },
    ],
  },
  login: {
    title: "Demo girişi",
    body: "Jüri demosu için bir rol seç.",
    selectLabel: "Rol",
    options: [
      { value: "ece", label: "Ece (Veli)" },
      { value: "mert", label: "Mert (Öğretmen)" },
    ],
    submit: "Giriş yap",
    pending: "Giriş yapılıyor…",
    error: "Giriş yapılamadı. Tekrar dene.",
  },
  panel: {
    parentTitle: "Çocuğunun haftası",
    teacherTitle: "Sınıf özeti (demo)",
    nav: { report: "Rapor", privacy: "Gizlilik", logout: "Çıkış" },
    roles: { parent: "Veli", teacher: "Öğretmen" },
    youthLabel: "Genç",
    youths: [
      { id: "usr_deniz", label: "Dengeli" },
      { id: "usr_deniz_risky", label: "Riskli" },
      { id: "usr_deniz_productive", label: "Üretken" },
    ],
    kvkk: "Bu panelde tam bağlantı veya alan adı gösterilmez.",
    loading: "Rapor yükleniyor…",
    empty: "Bu hafta henüz özet yok.",
    emptyHint: "Eklenti özet gönderince veya demo verisi yüklenince rapor burada görünür.",
    error: "Rapor alınamadı. Bağlantını kontrol edip tekrar dene.",
    retry: "Tekrar dene",
    consentTitle: "Veli onayı bekleniyor",
    consentBody: "Hesap, bir veli onaylayana kadar açılmaz. Veli yalnızca kategori özetlerini görür; tam bağlantı yok.",
    approve: "Onayla",
    approving: "Onaylanıyor…",
    approveError: "Onay gönderilemedi. Tekrar dene.",
    forbidden: "Bu gencin raporunu görme yetkin yok.",
    periodLabel: "Dönem",
    scoreTitle: "Bu haftaki denge",
    scoreOutOf: "100 üzerinden",
    reasonsTitle: "Neden böyle?",
    distributionTitle: "Kategori dağılımı (dakika)",
    minutes: "dk",
    trendTitle: "Eğilim",
    taskTitle: "Mikro-görev",
    taskOpen: "Açık",
    taskCompleted: "Tamamlandı",
    taskNone: "Bu hafta için görev yok.",
    shareTitle: "Velinle paylaşılacak özet",
    goalTitle: "Birlikte hedef",
    goal: "Bu hafta birlikte tek bir hedef seçin: değerli kategorilerde 30 dakika.",
  },
} as const;

void i18n.use(initReactI18next).init({
  resources: { tr: { translation: tr } },
  lng: "tr",
  fallbackLng: "tr",
  interpolation: { escapeValue: false },
});

export default i18n;
