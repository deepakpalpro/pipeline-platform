package com.pipelineplatform.api.pipeline;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pipelines")
public class PipelineController {

  private final PipelineService pipelineService;
  private final PipelineStepsService pipelineStepsService;

  public PipelineController(
      PipelineService pipelineService, PipelineStepsService pipelineStepsService) {
    this.pipelineService = pipelineService;
    this.pipelineStepsService = pipelineStepsService;
  }

  @PostMapping
  public ResponseEntity<PipelineResponse> create(@Valid @RequestBody CreatePipelineRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(pipelineService.create(request));
  }

  @GetMapping("/{id}")
  public PipelineResponse get(@PathVariable String id) {
    return pipelineService.get(id);
  }

  @GetMapping
  public List<PipelineResponse> list() {
    return pipelineService.list();
  }

  @PutMapping("/{id}")
  public PipelineResponse update(
      @PathVariable String id, @Valid @RequestBody UpdatePipelineRequest request) {
    return pipelineService.update(id, request);
  }

  @PutMapping("/{id}/steps")
  public PipelineResponse replaceSteps(
      @PathVariable String id, @Valid @RequestBody ReplacePipelineStepsRequest request) {
    return pipelineStepsService.replace(id, request);
  }

  @DeleteMapping("/{id}")
  public PipelineResponse archive(@PathVariable String id) {
    return pipelineService.archive(id);
  }
}
