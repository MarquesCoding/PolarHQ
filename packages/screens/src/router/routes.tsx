import { type ReactNode, Suspense, lazy } from "react"
import { Navigate, Route, Routes, useLocation, useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { type StorageKind, fetchSavedSearches } from "@workspace/core/drive"
import { fetchSetupStatus } from "@workspace/core/setup"
import { t } from "@workspace/i18n/config"
import {
  AdminLayout,
  DocsLayout,
  DriveLayout,
  PhotosLayout,
  SheetsLayout,
  WhiteboardsLayout,
} from "./layouts"
import SignIn from "@pages/SignIn/SignIn"
import Setup from "@pages/Setup/Setup"
import Account from "@pages/Account/Account"
import Library from "@pages/Photos/Library"
import PhotosTrash from "@pages/Photos/Trash"
import Favourites from "@pages/Photos/Favourites"
import Albums from "@pages/Photos/Albums"
import AlbumDetail from "@pages/Photos/AlbumDetail"
import TagView from "@pages/Photos/TagView"
import Browser from "@pages/Drive/Browser"
import StorageOverview from "@pages/Drive/StorageOverview"
import DriveTrash from "@pages/Drive/Trash"
import Overview from "@pages/Admin/Overview"
import Users from "@pages/Admin/Users"
import Groups from "@pages/Admin/Groups"
import Roles from "@pages/Admin/Roles"
import Apps from "@pages/Admin/Apps"
import Limits from "@pages/Admin/Limits"
import Branding from "@pages/Admin/Branding"
import Backup from "@pages/Admin/Backup"
import Settings from "@pages/Admin/Settings"
import Audit from "@pages/Admin/Audit"
import DocsList from "@pages/Docs/DocsList"
import Editor from "@pages/Docs/Editor"
import SheetsList from "@pages/Sheets/SheetsList"
import FullEditor from "@pages/Sheets/FullEditor"
import WhiteboardList from "@pages/Whiteboard/WhiteboardList"
import WhiteboardEditor from "@pages/Whiteboard/WhiteboardEditor"

const PhotoMap = lazy(() => import("@pages/Photos/PhotoMap"))
const DRIVE_KINDS: StorageKind[] = ["image", "video", "audio", "document", "archive", "other"]

const DriveFolder = () => {
  const { id } = useParams()
  return <Browser folderId={id} />
}

const DriveKind = () => {
  const { kind } = useParams()
  const valid = (DRIVE_KINDS as string[]).includes(kind ?? "") ? (kind as StorageKind) : "other"
  return <Browser source={{ view: "kind", kind: valid }} />
}

const DriveSearch = () => {
  const { id } = useParams()
  const { data } = useQuery({ queryKey: ["drive", "searches"], queryFn: fetchSavedSearches })
  const search = data?.find((entry) => entry.id === id)
  if (!search) return null
  return <Browser source={{ view: "search", query: search.name }} />
}

const AlbumDetailRoute = () => {
  const { id } = useParams()
  return <AlbumDetail albumId={id ?? ""} />
}

const TagViewRoute = () => {
  const { id } = useParams()
  return <TagView tagId={id ?? ""} />
}

const PhotoMapRoute = () => (
  <div className="flex min-h-0 flex-1 flex-col p-6">
    <Suspense
      fallback={
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          {t("photos:photoMap.loadingMap")}
        </div>
      }
    >
      <PhotoMap />
    </Suspense>
  </div>
)

const DocEditorRoute = () => {
  const { id } = useParams()
  return <Editor key={id} nodeId={id ?? ""} />
}

const SheetEditorRoute = () => {
  const { id } = useParams()
  return <FullEditor key={id} nodeId={id ?? ""} />
}

const WhiteboardEditorRoute = () => {
  const { id } = useParams()
  return <WhiteboardEditor key={id} nodeId={id ?? ""} />
}

const SheetsIdRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/sheet/${id}`} replace />
}

const DocsIdRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/document/${id}`} replace />
}

/**
 * On a fresh instance (no admin yet) every route funnels to the first-run wizard, so a new server
 * lands on /setup instead of a dead-end /sign-in form. Fails open: if the status can't be fetched we
 * render the app normally rather than trapping the user.
 */
const SetupGate = ({ children }: { children: ReactNode }) => {
  const location = useLocation()
  const { data } = useQuery({ queryKey: ["setup-status"], queryFn: fetchSetupStatus })
  if (data && !data.setupCompleted && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />
  }
  return children
}

export const AppRoutes = () => (
  <SetupGate>
    <Routes>
    <Route path="/" element={<Navigate to="/photos" replace />} />
    <Route path="/sign-in" element={<SignIn />} />
    <Route path="/setup" element={<Setup />} />
    <Route path="/account" element={<Account />} />

    <Route element={<PhotosLayout />}>
      <Route path="/photos" element={<Library />} />
      <Route path="/photos/trash" element={<PhotosTrash />} />
      <Route path="/photos/favourites" element={<Favourites />} />
      <Route path="/photos/albums" element={<Albums />} />
      <Route path="/photos/albums/:id" element={<AlbumDetailRoute />} />
      <Route path="/photos/tags/:id" element={<TagViewRoute />} />
      <Route path="/photos/map" element={<PhotoMapRoute />} />
    </Route>

    <Route element={<DriveLayout />}>
      <Route path="/drive" element={<StorageOverview />} />
      <Route path="/drive/files" element={<Browser />} />
      <Route path="/drive/favorites" element={<Browser source={{ view: "favorites" }} />} />
      <Route path="/drive/recent" element={<Browser source={{ view: "recent" }} />} />
      <Route path="/drive/trash" element={<DriveTrash />} />
      <Route path="/drive/kind/:kind" element={<DriveKind />} />
      <Route path="/drive/search/:id" element={<DriveSearch />} />
      <Route path="/drive/:id" element={<DriveFolder />} />
    </Route>

    <Route element={<AdminLayout />}>
      <Route path="/admin" element={<Overview />} />
      <Route path="/admin/users" element={<Users />} />
      <Route path="/admin/groups" element={<Groups />} />
      <Route path="/admin/roles" element={<Roles />} />
      <Route path="/admin/apps" element={<Apps />} />
      <Route path="/admin/limits" element={<Limits />} />
      <Route path="/admin/branding" element={<Branding />} />
      <Route path="/admin/backup" element={<Backup />} />
      <Route path="/admin/settings" element={<Settings />} />
      <Route path="/admin/audit" element={<Audit />} />
    </Route>

    <Route element={<DocsLayout />}>
      <Route path="/docs" element={<DocsList />} />
    </Route>
    <Route element={<SheetsLayout />}>
      <Route path="/sheets" element={<SheetsList />} />
    </Route>
    <Route element={<WhiteboardsLayout />}>
      <Route path="/whiteboards" element={<WhiteboardList />} />
    </Route>

    <Route path="/sheets/:id" element={<SheetsIdRedirect />} />
    <Route path="/docs/:id" element={<DocsIdRedirect />} />
    <Route path="/sheet/:id" element={<SheetEditorRoute />} />
    <Route path="/document/:id" element={<DocEditorRoute />} />
    <Route path="/whiteboard/:id" element={<WhiteboardEditorRoute />} />
    </Routes>
  </SetupGate>
)
