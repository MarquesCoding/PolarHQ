import CollabList from "@pages/Collab/CollabList"

const WhiteboardList = () => (
  <CollabList
    type="board"
    route="/whiteboards"
    iconName="palette"
    title="Whiteboards"
    createLabel="New whiteboard"
  />
)

export default WhiteboardList
