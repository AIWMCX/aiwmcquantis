

# AIWMC Quantis: Полный аудит и план стабилизации

## Текущее состояние (реальные данные на 14 февраля 2026)

| Метрика | Значение | Оценка |
|---------|----------|--------|
| Зарегистрированных пользователей | 11 | Критически мало |
| Активных Plus подписчиков | 2 | Слабая монетизация |
| Всего анализов | 24 (3 уникальных пользователя) | Низкая вовлечённость |
| Документов создано | 2 | Docs Studio не используется |
| Скачиваний отслежено | 0 | Tracking сломан |
| Лидов собрано | 5 | Воронка работает слабо |
| Location data в БД | 0 записей | Данные только в коде |
| Industry benchmarks в БД | 39 | Ниже заявленных 50+ |
| Template usage_count | 0-1 у всех | Почти не используется |
| Email sequences | 12 шаблонов | Ни один не триггерится автоматически |

---

## Конкурентный анализ

### Конкуренты и их ключевые фишки

| Конкурент | Что они делают лучше нас | Что у нас есть, чего нет у них |
|-----------|-------------------------|-------------------------------|
| **BizPlanAI Pro** | SWOT в выдаче, "investor-ready" PDF брендинг | Детерминистический финансовый движок (не LLM) |
| **ValidatorAI** | Чат с AI-ментором, скоринг 1-10, симуляция обратной связи | Location intelligence (50+ городов) |
| **LivePlan** ($20-40/мес) | Live дашборды, milestone tracking | Анонимный анализ без регистрации |
| **Upmetrics** ($7-30/мес) | Step-by-step wizard, коллаборация | Загрузка документов для углублённого анализа |

### Наши уникальные преимущества (сохранить и усилить)
- 7-слойная AI safety архитектура с truth labeling
- CFO-grounded детерминистические расчёты (не чёрный ящик)
- 3 сценария (пессимистичный/базовый/оптимистичный) в реальном времени
- Загрузка документов для enhanced analysis

### Что нам критически не хватает (реализовать)
1. Email lifecycle sequences не подключены -- пользователи регистрируются и забывают
2. Download tracking сломан -- 0 записей при наличии 2 документов
3. Idea Score уже добавлен, но SWOT section нужна доработка для экспорта в PDF
4. Нет автоматического cron для email sequences

---

## Критические баги (найдены при аудите кода)

### Баг 1: Download tracking не записывает данные
**Файл:** `src/hooks/useDocDownloadLimit.ts`
**Проблема:** `document_downloads` таблица имеет 0 записей, хотя документы создавались. Функция `recordDownload` вызывается в `saveAndDownload` (DocsStudio.tsx:246-254), но insert может тихо проваливаться из-за того, что `document_downloads` не имеет policy для authenticated INSERT через обычного пользователя - policy `Users can log own downloads` существует, но она RESTRICTIVE, и может конфликтовать с другой RESTRICTIVE policy `Deny anonymous access`.

**Решение:** Проверить RLS: все RESTRICTIVE policies на `document_downloads` создают AND-логику. Нужно чтобы authenticated user проходил через INSERT.

### Баг 2: `doc_templates` usage_count остаётся 0
**Проблема:** `increment_template_usage` RPC вызывается в `useCreateDocument` (useDocuments.ts:99), но только для Plus пользователей (документ сохраняется в БД только для Plus). Для free tier пользователей, которые только скачивают без сохранения, usage_count не инкрементируется.

**Решение:** Вызывать `increment_template_usage` при каждом скачивании, не только при сохранении документа.

### Баг 3: Email sequences существуют но не триггерятся
**Проблема:** Таблица `email_sequences` заполнена 12 шаблонами, edge function `send-lifecycle-email` работает корректно, но нет cron job или триггера, который бы проверял какие пользователи попадают под условия отправки.

**Решение:** Создать edge function `check-lifecycle-emails` с cron trigger, который проверяет условия и отправляет.

### Баг 4: `location_data` таблица пуста
**Проблема:** 0 записей в `location_data`, хотя embedded данные в `location-intelligence.ts` содержат 50+ городов. Edge function использует встроенные данные, но таблица в БД для Plus пользователей пуста.

**Решение:** Заполнить `location_data` из встроенных данных через seed migration.

---

## План реализации (стабилизация за одну сессию)

### Batch 1: Исправление сломанного tracking

**1.1 Fix download tracking** 
Проблема с RLS: таблица `document_downloads` имеет RESTRICTIVE policy `Deny anonymous access` и отдельную RESTRICTIVE `Users can log own downloads`. В PostgreSQL все RESTRICTIVE policies должны пройти (AND). Для authenticated пользователя: `Deny anonymous access` возвращает `false` для ROLE anon. Нужно убедиться что policy целит на правильную роль.

Действие: Изменить policy `Deny anonymous access to document_downloads` чтобы она целила на роль `anon`, а не `public`. Или сделать её PERMISSIVE.

**1.2 Fix template usage tracking for free tier**
В `DocsStudio.tsx` `saveAndDownload`, добавить вызов RPC `increment_template_usage` для всех пользователей при скачивании, не только при сохранении документа в БД.

### Batch 2: Email lifecycle automation

**2.1 Создать cron edge function `check-lifecycle-emails`**
Функция будет запускаться каждый час и проверять:
- Пользователи зарегистрированные 48+ часов назад без анализов -> `onboarding_step_1`
- Пользователи зарегистрированные 96+ часов назад без анализов -> `onboarding_step_2`  
- Пользователи с первым анализом 24+ часов назад -> `post_analysis_step_1`
- Неактивные 7+ дней -> `reengagement_step_1`

Для этого нужна таблица `email_sequence_log` для tracking отправленных писем (чтобы не отправлять дважды).

### Batch 3: Seed location data

**3.1 Создать migration для заполнения `location_data`**
Перенести данные из `LOCATION_DATABASE` (location-intelligence.ts) в таблицу `location_data`. Это позволит Plus пользователям получать location данные через API и видеть их в dashboard.

### Batch 4: UX polish для Docs Studio

**4.1 Добавить "Popular" badge на template карточки**
Поле `popular: true` существует в `TEMPLATE_CARDS` но не рендерится. Добавить визуальный badge.

**4.2 Increment template usage при download**
Сейчас usage_count инкрементируется только при создании документа в БД (Plus only). Нужно также считать free tier downloads.

---

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| DB migration | Создать таблицу `email_sequence_log`, заполнить `location_data`, исправить RLS на `document_downloads` |
| `supabase/functions/check-lifecycle-emails/index.ts` | Новая функция: cron для проверки и отправки lifecycle emails |
| `src/pages/DocsStudio.tsx` | Добавить `popular` badge на карточки; вызывать `increment_template_usage` при download |
| `src/hooks/useDocDownloadLimit.ts` | Добавить error logging для диагностики insert failures |

### Без изменений (уже работает правильно)
- Hero prefill -> WizardForm: исправлено в прошлой сессии
- SignupForm post-signup flow: исправлено в прошлой сессии  
- Dark mode unification: исправлено в прошлой сессии
- Idea Score Badge: добавлен в прошлой сессии
- SWOT Analysis: добавлен в прошлой сессии
- Social sharing buttons: добавлены в прошлой сессии
- handleGenerate toast: убран в прошлой сессии

