import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { createFolder, deleteFolder, listFolders, renameFolder, MAX_FOLDER_DEPTH } from "./folders";
import type { FolderNode } from "./folders";
import { NotFoundError, ValidationError } from "./errors";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeEach(() => {
  vi.restoreAllMocks();
});

function stubFolders(folders: FolderNode[]) {
  return vi.spyOn(client, "getPageProperty").mockResolvedValue(
    folders.length === 0
      ? null
      : { id: "prop-1", key: "folderIndex", value: folders, version: { number: 1 } }
  );
}

describe("listFolders", () => {
  it("folderIndex property가 없으면 빈 배열을 반환한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    await expect(listFolders("account-1")).resolves.toEqual([]);
  });

  it("folderIndex property가 있으면 그 값을 그대로 반환한다", async () => {
    const folders: FolderNode[] = [{ id: "f1", name: "업무", parentId: null, order: 0 }];
    stubFolders(folders);

    await expect(listFolders("account-1")).resolves.toEqual(folders);
  });
});

describe("createFolder", () => {
  it("최상위 폴더를 만들고 randomUUID로 id를 발급한다", async () => {
    stubFolders([]);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderIndex",
      value: [],
      version: { number: 1 },
    });

    const node = await createFolder("account-1", { name: "업무", parentId: null });

    expect(node).toEqual({ id: expect.stringMatching(UUID_PATTERN), name: "업무", parentId: null, order: 0 });
    expect(upsertSpy).toHaveBeenCalledWith("account-1", "folderIndex", [node]);
  });

  it("이름 앞뒤 공백을 정리하고, 빈 이름이면 ValidationError를 던진다", async () => {
    stubFolders([]);
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderIndex",
      value: [],
      version: { number: 1 },
    });

    const node = await createFolder("account-1", { name: "  업무  ", parentId: null });
    expect(node.name).toBe("업무");

    await expect(createFolder("account-1", { name: "   ", parentId: null })).rejects.toThrow(
      ValidationError
    );
  });

  it("존재하지 않는 parentId면 ValidationError를 던진다", async () => {
    stubFolders([]);

    await expect(
      createFolder("account-1", { name: "하위", parentId: "없는-id" })
    ).rejects.toThrow(ValidationError);
  });

  it("같은 parentId를 가진 형제 개수로 order를 계산해 항상 끝에 추가한다", async () => {
    const existing: FolderNode[] = [
      { id: "f1", name: "업무", parentId: null, order: 0 },
      { id: "f2", name: "개인", parentId: null, order: 1 },
      { id: "f3", name: "업무-하위", parentId: "f1", order: 0 },
    ];
    stubFolders(existing);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderIndex",
      value: [],
      version: { number: 1 },
    });

    const node = await createFolder("account-1", { name: "새폴더", parentId: null });

    expect(node.order).toBe(2);
    expect(upsertSpy).toHaveBeenCalledWith("account-1", "folderIndex", [...existing, node]);
  });

  it(`중첩 깊이가 ${MAX_FOLDER_DEPTH}단계를 넘으면 ValidationError를 던진다`, async () => {
    // f1(1) -> f2(2) -> f3(3) -> f4(4) -> f5(5) : 이미 5단계까지 있다.
    const chain: FolderNode[] = [];
    let parentId: string | null = null;
    for (let i = 1; i <= MAX_FOLDER_DEPTH; i++) {
      const id = `f${i}`;
      chain.push({ id, name: `${i}단계`, parentId, order: 0 });
      parentId = id;
    }
    stubFolders(chain);

    // f5 밑에 6단계 폴더를 만들려 하면 거부돼야 한다.
    await expect(
      createFolder("account-1", { name: "6단계", parentId: "f5" })
    ).rejects.toThrow(ValidationError);
  });

  it(`정확히 ${MAX_FOLDER_DEPTH}단계(경계값)는 허용한다`, async () => {
    const chain: FolderNode[] = [];
    let parentId: string | null = null;
    for (let i = 1; i < MAX_FOLDER_DEPTH; i++) {
      const id = `f${i}`;
      chain.push({ id, name: `${i}단계`, parentId, order: 0 });
      parentId = id;
    }
    stubFolders(chain);
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderIndex",
      value: [],
      version: { number: 1 },
    });

    // f(MAX_FOLDER_DEPTH - 1) 밑에 만들면 정확히 MAX_FOLDER_DEPTH단계가 된다.
    await expect(
      createFolder("account-1", { name: "마지막 단계", parentId: `f${MAX_FOLDER_DEPTH - 1}` })
    ).resolves.toMatchObject({ name: "마지막 단계" });
  });

  it("같은 부모 아래 형제 폴더와 이름이 겹치면 ValidationError를 던진다(P7-2)", async () => {
    stubFolders([{ id: "f1", name: "업무", parentId: null, order: 0 }]);

    await expect(
      createFolder("account-1", { name: "업무", parentId: null })
    ).rejects.toThrow(ValidationError);
  });

  it("부모가 다르면 같은 이름이어도 허용한다(P7-2)", async () => {
    const existing: FolderNode[] = [{ id: "f1", name: "업무", parentId: null, order: 0 }];
    stubFolders(existing);
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderIndex",
      value: [],
      version: { number: 1 },
    });

    await expect(
      createFolder("account-1", { name: "업무", parentId: "f1" })
    ).resolves.toMatchObject({ name: "업무", parentId: "f1" });
  });
});

describe("renameFolder", () => {
  it("이름을 바꾼다(P7-2)", async () => {
    const folders: FolderNode[] = [{ id: "f1", name: "업무", parentId: null, order: 0 }];
    stubFolders(folders);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderIndex",
      value: [],
      version: { number: 1 },
    });

    const updated = await renameFolder("account-1", "f1", "  새 이름  ");

    expect(updated).toEqual({ id: "f1", name: "새 이름", parentId: null, order: 0 });
    expect(upsertSpy).toHaveBeenCalledWith("account-1", "folderIndex", [updated]);
  });

  it("존재하지 않는 폴더면 NotFoundError를 던진다(P7-2)", async () => {
    stubFolders([{ id: "f1", name: "업무", parentId: null, order: 0 }]);

    await expect(renameFolder("account-1", "없는-id", "새 이름")).rejects.toThrow(NotFoundError);
  });

  it("빈 이름이면 ValidationError를 던진다(P7-2)", async () => {
    stubFolders([{ id: "f1", name: "업무", parentId: null, order: 0 }]);

    await expect(renameFolder("account-1", "f1", "   ")).rejects.toThrow(ValidationError);
  });

  it("다른 형제 폴더와 이름이 겹치면 ValidationError를 던진다(P7-2)", async () => {
    const folders: FolderNode[] = [
      { id: "f1", name: "업무", parentId: null, order: 0 },
      { id: "f2", name: "개인", parentId: null, order: 1 },
    ];
    stubFolders(folders);

    await expect(renameFolder("account-1", "f2", "업무")).rejects.toThrow(ValidationError);
  });

  it("자기 자신과 같은 이름으로 '바꾸는' 것은 허용한다(자기 자신은 중복 비교에서 제외, P7-2)", async () => {
    const folders: FolderNode[] = [{ id: "f1", name: "업무", parentId: null, order: 0 }];
    stubFolders(folders);
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderIndex",
      value: [],
      version: { number: 1 },
    });

    await expect(renameFolder("account-1", "f1", "업무")).resolves.toMatchObject({ name: "업무" });
  });
});

describe("deleteFolder", () => {
  it("대상 폴더 노드를 목록에서 제거한다", async () => {
    const folders: FolderNode[] = [
      { id: "f1", name: "업무", parentId: null, order: 0 },
      { id: "f2", name: "개인", parentId: null, order: 1 },
    ];
    stubFolders(folders);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderIndex",
      value: [],
      version: { number: 1 },
    });

    await deleteFolder("account-1", "f1");

    expect(upsertSpy).toHaveBeenCalledWith("account-1", "folderIndex", [folders[1]]);
  });

  it("존재하지 않는 폴더면 NotFoundError를 던지고 아무것도 쓰지 않는다", async () => {
    stubFolders([{ id: "f1", name: "업무", parentId: null, order: 0 }]);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");

    await expect(deleteFolder("account-1", "없는-id")).rejects.toThrow(NotFoundError);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("직속 하위 폴더는 삭제되지 않고 삭제 대상의 parentId로 승격된다(P7-2, 최상위 삭제)", async () => {
    const folders: FolderNode[] = [
      { id: "top", name: "최상위", parentId: null, order: 0 },
      { id: "child-a", name: "자식A", parentId: "top", order: 0 },
      { id: "child-b", name: "자식B", parentId: "top", order: 1 },
      { id: "grandchild", name: "손자", parentId: "child-a", order: 0 },
    ];
    stubFolders(folders);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderIndex",
      value: [],
      version: { number: 1 },
    });

    await deleteFolder("account-1", "top");

    const written = upsertSpy.mock.calls[0][2] as FolderNode[];
    expect(written.find((f) => f.id === "top")).toBeUndefined();
    // 직속 자식(child-a, child-b)은 최상위 폴더(top)의 parentId였던 null로 승격된다.
    expect(written.find((f) => f.id === "child-a")?.parentId).toBeNull();
    expect(written.find((f) => f.id === "child-b")?.parentId).toBeNull();
    // 손자(grandchild)는 건드리지 않아도 부모(child-a)를 그대로 따라간다.
    expect(written.find((f) => f.id === "grandchild")?.parentId).toBe("child-a");
  });

  it("중간 폴더를 삭제하면 그 직속 자식이 삭제된 폴더의 parentId(최상위가 아닌 상위 폴더)로 승격된다", async () => {
    const folders: FolderNode[] = [
      { id: "top", name: "최상위", parentId: null, order: 0 },
      { id: "middle", name: "중간", parentId: "top", order: 0 },
      { id: "leaf", name: "말단", parentId: "middle", order: 0 },
    ];
    stubFolders(folders);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderIndex",
      value: [],
      version: { number: 1 },
    });

    await deleteFolder("account-1", "middle");

    const written = upsertSpy.mock.calls[0][2] as FolderNode[];
    expect(written.find((f) => f.id === "leaf")?.parentId).toBe("top");
  });
});
