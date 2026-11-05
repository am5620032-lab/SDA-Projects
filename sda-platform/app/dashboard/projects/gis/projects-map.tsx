'use client'

import { divIcon } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { DevelopmentProject } from '../actions'

const projectIcon = divIcon({
  className: 'project-map-marker',
  html: '<span class="project-map-marker__dot"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const formatBudget = (value: number) => new Intl.NumberFormat('ar-LY').format(value)

export default function ProjectsMap({ projects }: { projects: DevelopmentProject[] }) {
  return (
    <MapContainer
      center={[26.3, 14.0]}
      zoom={5}
      minZoom={4}
      maxZoom={16}
      scrollWheelZoom
      className="h-[min(70vh,720px)] min-h-[420px] w-full invert hue-rotate-180 brightness-90 contrast-125 grayscale-[30%]"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {projects.map((project) => (
        <Marker
          key={project.id}
          position={[project.latitude as number, project.longitude as number]}
          icon={projectIcon}
          title={project.project_name}
          alt={project.project_name}
        >
          <Popup>
            <div className="min-w-44 space-y-1.5 text-right" dir="rtl">
              <h3 className="font-bold">{project.project_name}</h3>
              <p>القطاع: {project.sector}</p>
              <p>الحالة: {project.status}</p>
              <p>الميزانية: {formatBudget(project.estimated_budget)} د.ل</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}