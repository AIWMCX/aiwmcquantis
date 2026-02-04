
# AIWMC QUANTIS™ — DOCS STUDIO
## Полный технический план реализации

---

## 1. ЧТО ЭТО ЗА ФИЧА (ПРОСТЫМ ЯЗЫКОМ)

**Docs Studio** — это новый модуль AIWMC Quantis, который превращает данные анализа в готовые профессиональные документы.

### Как это работает:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        ТЕКУЩИЙ FLOW                                  │
│  Пользователь → Анализ → Результаты → Скачать PDF                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ НОВЫЙ FLOW ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        DOCS STUDIO                                   │
│  Результаты → Выбрать шаблон → Редактор (как Google Docs)           │
│            → Экспорт PDF/DOCX/Markdown → Поделиться                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 3 главных шага для пользователя:
1. **Выбери цель** — "Сделать счёт", "Квартальный отчёт", "Техдок", "Договор"
2. **Заполни форму** — 5-12 умных вопросов (только нужные поля)
3. **Редактируй и экспортируй** — как в Google Docs

---

## 2. ПОЧЕМУ ЛЮДИ БУДУТ ИСПОЛЬЗОВАТЬ

| Проблема | Решение Docs Studio |
|----------|---------------------|
| **Время и хаос** — документы делают вручную, путают версии | Один источник данных → документ за минуты → версии сохраняются |
| **"Не знаю, что написать"** — пустая страница пугает | Guided-формы + готовые блоки + подсказки |
| **Риск ошибок** — счёт/договор с ошибкой стоит денег | Чеклисты качества, обязательные поля, предупреждения |

---

## 3. MVP ШАБЛОНЫ (ПЕРВАЯ ОЧЕРЕДЬ)

### Финансы (идеально подходит к Quantis):
- **Invoice** — счёт клиенту с таблицей услуг
- **Quarterly Summary** — отчёт для инвестора
- **Cashflow Snapshot** — вход/выход/бёрн/ранвей

### Операционка/Стартап:
- **Founder Agreement** — соглашение основателей
- **NDA** — соглашение о неразглашении
- **Contractor Agreement** — договор подряда

### Техдок (для SaaS):
- **Technical Architecture Overview** — обзор архитектуры

### Legal-light:
- **DMCA Notice** — шаблон уведомления

---

## 4. АРХИТЕКТУРА РЕШЕНИЯ

### 4.1 Новые компоненты

```text
┌────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                    │
├────────────────────────────────────────────────────────────────────┤
│  TemplatePicker     │ Каталог шаблонов с категориями и поиском     │
│  IntakeForm         │ Динамическая форма с авто-заполнением        │
│  DocumentEditor     │ Tiptap редактор (ProseMirror) как Notion     │
│  ExportPanel        │ PDF/DOCX/MD + share link                     │
│  VersionHistory     │ История изменений                            │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                         BACKEND                                     │
├────────────────────────────────────────────────────────────────────┤
│  generate-document  │ Edge function: template + data → document    │
│  export-document    │ Edge function: document → PDF/DOCX (async)   │
│  template-engine    │ Обработка условий, переменных, валидации     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                    │
├────────────────────────────────────────────────────────────────────┤
│  doc_templates      │ Библиотека шаблонов                          │
│  documents          │ Созданные документы (ProseMirror JSON)       │
│  document_versions  │ История версий                               │
│  document_exports   │ Экспортированные файлы                       │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Структура шаблона (Template Engine)

```json
{
  "meta": {
    "id": "invoice_v1",
    "version": "1.0.0",
    "category": "finance",
    "tier": "free",
    "name": "Professional Invoice",
    "description": "Generate client invoices in seconds"
  },
  "variables": [
    { "key": "company_name", "type": "string", "required": true, "autofill": "user.company_name" },
    { "key": "client_name", "type": "string", "required": true },
    { "key": "items", "type": "table", "required": true, "columns": ["description", "qty", "price"] },
    { "key": "tax_rate", "type": "number", "required": false, "default": 0 },
    { "key": "due_date", "type": "date", "required": true }
  ],
  "blocks": [
    { "id": "header", "type": "heading", "level": 1, "content": "{{company_name}} Invoice" },
    { "id": "client", "type": "paragraph", "content": "Bill to: {{client_name}}" },
    { "id": "items_table", "type": "table", "bind": "items" },
    { "id": "tax_block", "type": "paragraph", "content": "Tax ({{tax_rate}}%): {{calculated.tax_amount}}" },
    { "id": "total", "type": "paragraph", "content": "**Total: {{calculated.total}}**" }
  ],
  "conditions": [
    { "if": "tax_rate > 0", "include_blocks": ["tax_block"] }
  ],
  "calculations": [
    { "key": "subtotal", "formula": "SUM(items.price * items.qty)" },
    { "key": "tax_amount", "formula": "subtotal * (tax_rate / 100)" },
    { "key": "total", "formula": "subtotal + tax_amount" }
  ],
  "validation": [
    { "rule": "items.length > 0", "message": "At least one item required" },
    { "rule": "total > 0", "message": "Total must be positive" }
  ]
}
```

---

## 5. СХЕМА БАЗЫ ДАННЫХ

### 5.1 Новые таблицы

```sql
-- Библиотека шаблонов документов
CREATE TABLE doc_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Метаданные
  template_id TEXT NOT NULL UNIQUE, -- 'invoice_v1', 'nda_basic'
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'finance', 'legal', 'operations', 'tech'
  tier TEXT DEFAULT 'free', -- 'free', 'plus', 'enterprise'
  icon TEXT, -- Lucide icon name
  
  -- Структура шаблона
  template_json JSONB NOT NULL, -- Полная структура шаблона
  
  -- Использование
  usage_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  
  -- Версионирование
  version TEXT DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Метаданные
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Созданные документы
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID, -- Для team-функционала (Phase 2)
  
  -- Связь с шаблоном и анализом
  template_id UUID REFERENCES doc_templates(id),
  analysis_id UUID REFERENCES analyses(id), -- Источник данных
  
  -- Содержимое
  title TEXT NOT NULL,
  document_json JSONB NOT NULL, -- ProseMirror/Tiptap JSON
  variables_data JSONB DEFAULT '{}', -- Заполненные переменные
  
  -- Статус
  status TEXT DEFAULT 'draft', -- 'draft', 'review', 'final'
  
  -- Версионирование
  version INTEGER DEFAULT 1,
  
  -- Совместный доступ
  is_shared BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,
  share_expires_at TIMESTAMPTZ,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- История версий документов
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  version_number INTEGER NOT NULL,
  snapshot_json JSONB NOT NULL, -- Полный snapshot документа
  
  -- Кто и когда
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Описание изменений
  change_description TEXT,
  
  UNIQUE(document_id, version_number)
);

-- Экспорты документов
CREATE TABLE document_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Формат и файл
  format TEXT NOT NULL, -- 'pdf', 'docx', 'md', 'html'
  file_url TEXT, -- URL в storage
  file_size_bytes BIGINT,
  
  -- Статус генерации
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  
  -- Метаданные
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_doc_templates_category ON doc_templates(category) WHERE is_active = TRUE;
CREATE INDEX idx_doc_templates_tier ON doc_templates(tier) WHERE is_active = TRUE;
CREATE INDEX idx_documents_user ON documents(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_analysis ON documents(analysis_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_versions_doc ON document_versions(document_id, version_number DESC);
```

### 5.2 RLS Политики

```sql
-- doc_templates: публичные шаблоны + tier-gating
ALTER TABLE doc_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view free templates"
  ON doc_templates FOR SELECT
  USING (is_active = TRUE AND tier = 'free');

CREATE POLICY "Plus users can view plus templates"
  ON doc_templates FOR SELECT
  USING (is_active = TRUE AND tier = 'plus' AND verify_plus_subscription(auth.uid()));

CREATE POLICY "Service role manages templates"
  ON doc_templates FOR ALL
  USING (is_service_role());

-- documents: только владелец
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 6. EDGE FUNCTIONS

### 6.1 generate-document

```typescript
// supabase/functions/generate-document/index.ts
// Генерация документа из шаблона + данных анализа

POST /generate-document
Body: {
  template_id: string,
  analysis_id?: string,      // Опционально: подтянуть данные из анализа
  variables: Record<string, any>,
  title: string
}

Response: {
  success: true,
  document_id: string,
  document_json: ProseMirrorJSON
}
```

### 6.2 export-document

```typescript
// supabase/functions/export-document/index.ts
// Асинхронный экспорт в PDF/DOCX

POST /export-document
Body: {
  document_id: string,
  format: 'pdf' | 'docx' | 'md',
  idempotency_key?: string
}

Response: {
  success: true,
  export_id: string,
  status: 'pending'
}

// Polling:
GET /export-document?export_id=xxx
Response: {
  status: 'completed',
  download_url: string
}
```

---

## 7. FRONTEND КОМПОНЕНТЫ

### 7.1 Структура файлов

```
src/
├── components/
│   └── docs/
│       ├── TemplatePicker.tsx      # Каталог шаблонов
│       ├── TemplateCard.tsx        # Карточка шаблона
│       ├── IntakeForm.tsx          # Динамическая форма
│       ├── DocumentEditor.tsx      # Tiptap редактор
│       ├── EditorToolbar.tsx       # Панель инструментов
│       ├── BlockMenu.tsx           # Меню блоков (Notion-style)
│       ├── VariableChip.tsx        # Переменная в тексте
│       ├── ExportPanel.tsx         # Панель экспорта
│       ├── VersionHistory.tsx      # История версий
│       └── DocumentPreview.tsx     # Предпросмотр
├── hooks/
│   ├── useDocumentEditor.ts        # Состояние редактора
│   ├── useTemplates.ts             # Загрузка шаблонов
│   ├── useDocumentExport.ts        # Экспорт документов
│   └── useDocumentVersions.ts      # Работа с версиями
├── pages/
│   ├── DocsStudio.tsx              # Главная страница Docs
│   ├── DocumentEditor.tsx          # Страница редактирования
│   └── TemplateLibrary.tsx         # Библиотека шаблонов
└── types/
    └── document.ts                 # Типы документов
```

### 7.2 Основной компонент редактора

```tsx
// DocumentEditor.tsx - упрощённая структура
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';

export function DocumentEditor({ documentId }: { documentId: string }) {
  const { document, updateDocument, isLoading } = useDocument(documentId);
  const { exportDocument, isExporting } = useDocumentExport();
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      Placeholder.configure({ placeholder: 'Start typing...' }),
      // Кастомные расширения для переменных
      VariableExtension,
    ],
    content: document?.document_json,
    onUpdate: ({ editor }) => {
      // Autosave каждые 3 секунды
      debouncedSave(editor.getJSON());
    },
  });

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="flex-1 prose max-w-none" />
      <ExportPanel 
        onExport={(format) => exportDocument(documentId, format)}
        isExporting={isExporting}
      />
    </div>
  );
}
```

---

## 8. ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩИМ QUANTIS

### 8.1 Кнопка "Create Document" в результатах анализа

```tsx
// В AnalysisResults.tsx добавить:
<Button onClick={() => navigate(`/docs/new?analysis=${analysisId}`)}>
  <FileText className="w-4 h-4 mr-2" />
  Create Document
</Button>
```

### 8.2 Автозаполнение из анализа

Когда пользователь создаёт документ из анализа, система автоматически подтягивает:

- **Quarterly Summary**: MRR, ARR, расходы, маржа, выводы
- **Invoice**: название компании, локация, дата
- **Tech Doc**: industry detected, data sources

---

## 9. ФАЗЫ РЕАЛИЗАЦИИ

### Phase 1: MVP (2-3 недели)
- [ ] Таблицы БД + RLS
- [ ] 3 шаблона (Invoice, Quarterly Summary, NDA)
- [ ] TemplatePicker + IntakeForm
- [ ] Базовый редактор (Tiptap)
- [ ] Экспорт в PDF
- [ ] Интеграция в /app

### Phase 2: Enhanced Editor (2 недели)
- [ ] Все 8 MVP шаблонов
- [ ] История версий
- [ ] DOCX экспорт
- [ ] Drag-and-drop блоков
- [ ] AI-команды ("переформулируй", "укороти")

### Phase 3: Collaboration (2 недели)
- [ ] Share links
- [ ] Кастомные шаблоны пользователей
- [ ] Workspace folders
- [ ] Аудит лог

---

## 10. ТЕХНИЧЕСКИЕ ЗАВИСИМОСТИ

### Новые пакеты:
```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-table": "^2.x",
  "@tiptap/extension-placeholder": "^2.x",
  "docx": "^8.x"  // Для DOCX генерации на сервере
}
```

### Lovable AI модели для AI-команд:
- `google/gemini-2.5-flash` — быстрые переформулировки
- `openai/gpt-5-mini` — сложные редактуры

---

## 11. БЕЗОПАСНОСТЬ

1. **RLS**: Документы доступны только владельцу
2. **Tier-gating**: Plus шаблоны только для Plus подписчиков
3. **Валидация**: Zod схемы на входе
4. **Rate-limiting**: 10 экспортов/час для Free
5. **Аудит**: Логирование создания/экспорта

---

## 12. README ДЛЯ РАЗРАБОТЧИКОВ

```markdown
# AIWMC Quantis Docs Studio

## Что это
Модуль генерации профессиональных документов на основе шаблонов.
Пользователь выбирает шаблон → заполняет данные → редактирует как в Google Docs → экспортирует.

## Быстрый старт
1. Перейти в /docs
2. Выбрать шаблон
3. Заполнить форму (данные могут подтягиваться из анализа)
4. Редактировать документ
5. Экспортировать в PDF/DOCX

## Архитектура
- Frontend: React + Tiptap (ProseMirror)
- Backend: Supabase Edge Functions
- Storage: Supabase Storage для экспортов
- DB: PostgreSQL с RLS

## Шаблоны
Шаблоны хранятся как JSON с:
- `variables` — типизированные поля
- `blocks` — структура документа
- `conditions` — логика включения блоков
- `validation` — правила перед экспортом

## Безопасность
- RLS на всех таблицах
- Tier-gating для Premium шаблонов
- Rate-limiting экспортов
```

---

## ИТОГО

Docs Studio превращает AIWMC Quantis из "анализатора" в **полноценный бизнес-инструмент**:
- Анализ → Документ → Действие
- Никаких "пустых страниц" — всё через guided flow
- Профессиональный редактор уровня Google Docs
- Экспорт в любом формате

**Ключевая ценность**: Пользователь не выходит в сторонние сервисы, а закрывает задачу быстрее и дешевле прямо в Quantis.
