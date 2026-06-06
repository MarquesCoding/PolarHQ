import CollabList from "@pages/Collab/CollabList"

const SheetsList = () => (
  <CollabList
    type="sheet"
    route="/sheets"
    iconName="table"
    title="Spreadsheets"
    createLabel="New spreadsheet"
  />
)

export default SheetsList
