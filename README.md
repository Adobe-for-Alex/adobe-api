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

## POST `/admin`

Добавить уже зарегистрированного админа с панелью

### Headers
```
Content-Type: application/json
```

### Body

```json
{
  "email": "board-owner-email",
  "password": "board-owner-password"
}
```

## POST `/users`

Создать пользователя

### Headers
```
Content-Type: application/json
```

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

## GET `/users/{email}`

Получить информацию о пользователе

### Response

```json
{
  "email": "user-email",
  "password": "user-password",
  "token": "euJ...GgH",
  "deleted": true,
  "createdAt": "2024-11-29T00:52:03.462Z",
  "updatedAt": "2024-11-29T00:52:58.656Z"
}
```

## DELETE `/users/{email}`

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

