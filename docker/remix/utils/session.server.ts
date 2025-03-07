import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { prisma } from "./db.server";
import bcrypt from "bcryptjs";

// セッションストレージの設定
const sessionSecret = process.env.SESSION_SECRET || "default-secret-for-development";

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "psyexam_session",
    secure: false, // 開発環境ではfalse
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日間
    httpOnly: true,
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
});

// ユーザーセッションの取得
export async function getUserSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  console.log(`[getUserSession] Cookie取得: ${cookie ? '存在します' : '存在しません'}`);
  if (cookie) {
    console.log(`[getUserSession] Cookie値: ${cookie.substring(0, 50)}...`);
  }
  
  try {
    const session = await sessionStorage.getSession(cookie);
    console.log(`[getUserSession] セッション取得成功`);
    return session;
  } catch (error) {
    console.error(`[getUserSession] セッション取得エラー:`, error);
    throw error;
  }
}

// ユーザーIDの取得
export async function getUserId(request: Request) {
  console.log(`[getUserId] リクエストからセッション取得開始`);
  console.log(`[getUserId] Cookie: ${request.headers.get("Cookie")?.substring(0, 50)}...`);
  
  const session = await getUserSession(request);
  try {
    console.log(`[getUserId] セッション取得成功`);
    const userId = session.get("userId");
    console.log(`[getUserId] セッションからuserIdを取得: ${userId}`);
    
    if (!userId) {
      console.log(`[getUserId] userIdがnullまたは未定義`);
      return null;
    }
    
    const parsedId = parseInt(userId, 10);
    if (isNaN(parsedId)) {
      console.log(`[getUserId] userIdの数値変換に失敗: ${userId}`);
      return null;
    }
    
    console.log(`[getUserId] 有効なuserIdを返却: ${parsedId}`);
    return parsedId;
  } catch (error) {
    console.error(`[getUserId] エラー発生:`, error);
    return null;
  }
}

// ユーザー情報の取得
export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, isApproved: true, email: true, fullName: true }
    });
    return user;
  } catch (error) {
    throw logout(request);
  }
}

// ユーザーセッションの必須チェック
export async function requireUserId(request: Request, redirectTo: string = "/login") {
  const userId = await getUserId(request);
  if (!userId) {
    throw redirect(redirectTo);
  }
  return userId;
}

// 承認済みユーザーの確認
export async function requireApprovedUser(request: Request) {
  const userId = await requireUserId(request);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isApproved: true }
  });
  
  if (!user || !user.isApproved) {
    throw redirect("/waiting-approval");
  }
  
  return userId;
}

// 管理者権限の確認
export async function requireAdmin(request: Request) {
  const userId = await requireApprovedUser(request);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  
  if (!user || user.role.toLowerCase() !== "admin") {
    throw redirect("/unauthorized");
  }
  
  return userId;
}

// ログイン認証
export async function login({ username, password }: { username: string, password: string }) {
  console.log(`[login] ユーザー検索開始: ${username}`); // デバッグログ
  
  try {
    // データベース接続の状態を確認
    console.log(`[login] データベース接続確認中...`);
    try {
      const userCount = await prisma.user.count();
      console.log(`[login] データベース接続成功。ユーザー総数: ${userCount}`);
    } catch (dbError) {
      console.error(`[login] データベース接続エラー:`, dbError);
    }
    
    // ユーザー検索
    console.log(`[login] ユーザー検索クエリ実行: username=${username}`);
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      console.log(`[login] ユーザーが見つかりません: ${username}`); // デバッグログ
      
      // 全ユーザーリストを取得して確認（デバッグ用）
      const allUsers = await prisma.user.findMany({
        select: { id: true, username: true, role: true }
      });
      console.log(`[login] 現在のユーザー一覧:`, JSON.stringify(allUsers, null, 2));
      
      return null;
    }

    console.log(`[login] ユーザー見つかりました: ID=${user.id}, ロール=${user.role}`); // デバッグログ

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`[login] パスワード検証結果: ${isPasswordValid ? '成功' : '失敗'}`); // デバッグログ
    
    if (!isPasswordValid) return null;

    return user;
  } catch (error) {
    console.error(`[login] エラー発生:`, error); // デバッグログ
    throw error;
  }
}

// ログアウト処理
export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

// ログインセッション作成
export async function createUserSession(userId: number, redirectTo: string) {
  console.log(`[createUserSession] 開始: userId=${userId}, redirectTo=${redirectTo}`); // デバッグログ
  
  try {
    const session = await sessionStorage.getSession();
    console.log(`[createUserSession] セッション取得成功`); // デバッグログ
    
    // 文字列に変換して保存
    session.set("userId", userId.toString());
    console.log(`[createUserSession] userId=${userId.toString()}をセッションに設定`); // デバッグログ
    
    const cookie = await sessionStorage.commitSession(session, {
      maxAge: 60 * 60 * 24 * 30 // 30日間
    });
    console.log(`[createUserSession] セッションをコミットしました`); // デバッグログ
    console.log(`[createUserSession] Cookie値: ${cookie.substring(0, 20)}...`); // デバッグログ（最初の部分だけを表示）

    return redirect(redirectTo, {
      headers: {
        "Set-Cookie": cookie,
      },
    });
  } catch (error) {
    console.error("[createUserSession] エラー発生:", error); // デバッグログ
    throw new Error(`セッションの作成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}