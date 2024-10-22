# Adobe API

Это микросервис предоставляющий REST-подобное API
для ограниченного фукнционала [Adobe](adobe.com)

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

