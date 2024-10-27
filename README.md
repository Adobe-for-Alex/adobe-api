# Adobe API

Это микросервис предоставляющий REST-подобное API
для ограниченного фукнционала [Adobe](adobe.com)

# Как запустить проект?

```sh
$ git clone ...
$ pnpm i
$ pnpm dev
```

> [!WARNING]
> `pnpm dev` - поднимает необходимое окружение в Docker
> После работы стоит выполнить `pnpm dev:down`, что бы выключить это окружение

# Как сделать миграцию с Prisma?

> [!NOTE]
> Все действия должны производится в окружении разработки, которое поднимается коммандой `pnpm dev:up` или `pnpm dev`

- Меняешь `prisma/schema.prisma` как тебе необходимо
- Выполняешь `pnpm prisma:migrate:new`
- Меняешь сгенерированный SQL файл в `prisma/migrations/` как тебе необходимо (можешь и не менять, но учти, что Prisma любит дропать все подряд)
- Выполняешь `pnpm prisma:migrate:apply`

# REST API

## GET `/boards`

Получить список ID всех зарегистрированных в микросервисе досок,
на которых еще доступна подписка

### Response

```json
[
  "some-internal-board-id-1",
  "some-internal-board-id-2",
  "some-internal-board-id-3"
]
```

## POST `/boards`

Зарегистрировать новую доску в микросервисе

### Body

> [!WARNING]
> Пока точно не известно, какие данные нужны для управления конкретной доской,
> поэтому этот раздел будет изменем в будущем

```json
{
  "email": "board-owner-email",
  "password": "board-owner-password",
  "something": "else"
}
```

### Response

```json
"some-internal-board-id"
```

## GET `/boards/{id}`

Получить информацию по конкретной доске

> [!WARNING]
> Информация выдается даже по доске, накоторой нет подписки

### Response

```json
{
  "id": "some-internal-board-id",
  "subscription": true,
  "user_limit": 5,
  "users": [
    "some-internal-user-id-1",
    "some-internal-user-id-2",
    "some-internal-user-id-3",
    "some-internal-user-id-4",
    "some-internal-user-id-5"
  ]
}
```

> [!NOTE]
> `"user_limit"` - количество свободных мест на доске.
> К доске можно подключить ограниченно количество пользователей

## DELETE `/boards/{id}`

Удалить доску

## POST `/users`

Создать пользователя

### Body

```json
{
  "email": "user-email",
  "password": "user-password"
}
```

### Response

```json
"some-internal-user-id"
```

## GET `/users/{id}`

Получить информацию о пользователе

### Response

```json
{
  "id": "some-internal-user-id",
  "email": "user-email",
  "password": "user-password",
  "board": "some-internal-board-id"
}
```

## PUT `/users/{id}`

### Body

```json
{
  "board": "some-new-internal-board-id"
}
```

## DELETE `/users/{id}`

Удалить пользователя

# Основные технологии

- [Express](https://www.npmjs.com/package/express)
- [Prisma](https://www.npmjs.com/package/prisma)

# Как внести свои измменения?

- Форкаешь репозиторий
- Клонишь свой форк
- Создаешь отдельную ветку для своиз изменений
(это важно для избежания гемороя при параллельной разработке нескольких фич)
- Комитишь изменения в свою ветку
- Оформляешь Pull Request
- Если твои изменения исправляют какие-то проблемы из раздела Issue,
то добавь их номера в описании PR в следующем виде:
```
Fixes #1
Fixes #2
Fixes #3
```
[Почему так стоит делать](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)

