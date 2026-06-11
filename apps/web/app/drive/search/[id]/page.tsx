"use client"

import { use } from "react"
import { fetchSavedSearches } from "@lib/drive"
import { useQuery } from "@tanstack/react-query"
import Browser from "@pages/Drive/Browser"

const Page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params)
  const { data } = useQuery({ queryKey: ["drive", "searches"], queryFn: fetchSavedSearches })
  const search = data?.find((entry) => entry.id === id)
  if (!search) return null
  return <Browser source={{ view: "search", query: search.name }} />
}

export default Page
