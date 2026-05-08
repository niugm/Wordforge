import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/store/useUIStore";

export function SearchDialog() {
  const open = useUIStore((s) => s.searchOpen);
  const setSearch = useUIStore((s) => s.setSearch);

  return (
    <Dialog open={open} onOpenChange={setSearch}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>全文搜索</DialogTitle>
          <DialogDescription>搜索章节、角色、大纲</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="输入关键词..." className="pl-9" autoFocus />
        </div>
        <div className="min-h-32 py-4 text-sm text-muted-foreground">
          TODO: F10 全文检索（doc/07） — FTS5 索引、按作品/类别分组、关键词高亮
        </div>
      </DialogContent>
    </Dialog>
  );
}
