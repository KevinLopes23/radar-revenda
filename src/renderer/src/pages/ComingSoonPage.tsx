type Props = {
  title: string
  description: string
  stage: string
}

export function ComingSoonPage({ title, description, stage }: Props) {
  return (
    <div className="page page--center">
      <div className="soon">
        <div className="soon__radar" aria-hidden="true" />
        <p className="eyebrow">{stage}</p>
        <h1>{title}</h1>
        <p className="page__lead">{description}</p>
      </div>
    </div>
  )
}
