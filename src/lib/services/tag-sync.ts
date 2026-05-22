/**
 * 角色标签同步服务
 * 将角色表单中的标签名数组同步到 tags 表 + character_tags 关联表，
 * 使列表页的 TagFilter 过滤器能识别。
 */
export async function syncCharacterTagsByNames(charId: string, tagNames: string[]): Promise<void> {
  try {
    const allTagsRes = await fetch("/api/tags");
    const allTags: { id: string; name: string }[] = allTagsRes.ok ? await allTagsRes.json() : [];
    const tagIds: string[] = [];
    for (const name of tagNames) {
      const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        tagIds.push(existing.id);
      } else if (name.trim()) {
        const res = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), color: null }),
        });
        if (res.ok) {
          const created: { id: string } = await res.json();
          tagIds.push(created.id);
        }
      }
    }
    await fetch(`/api/characters/${charId}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds }),
    });
  } catch (e) {
    console.warn("[syncCharacterTagsByNames]", e);
  }
}
