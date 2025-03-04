-- NULLまたは無効なタイムスタンプを持つユーザーの更新
UPDATE users
SET
    created_at = COALESCE(
        NULLIF(created_at, '0000-00-00 00:00:00'),
        NOW()
    ),
    updated_at = COALESCE(
        NULLIF(updated_at, '0000-00-00 00:00:00'),
        NOW()
    )
WHERE
    updated_at IS NULL
    OR created_at IS NULL
    OR updated_at = '0000-00-00 00:00:00'
    OR created_at = '0000-00-00 00:00:00';

-- ユーザーテーブルの状態を確認
SELECT
    id,
    username,
    role,
    is_approved,
    created_at,
    updated_at
FROM users;